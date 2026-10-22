import Refund from "./refund.model.js";
import Payment from "./payment.model.js";
import Order from "./order.model.js";
import Allocation from "./allocation.model.js";
import * as pf from "./payfast.client.js";
import { ensureFinancials, postEntry } from "./ledger.service.js";
import { splitByWeights, reversedShare, formatMinor, minorToPkr } from "./money.js";
import { httpError, assertObjectId, assertStaffPermission, parsePage, pageMeta } from "./access.js";
import { safeAudit } from "../../utils/audit.js";

const isDup = (e) => e?.code === 11000;
const REFUNDABLE = ["paid", "partially_refunded"];

const loadPaidPayment = async (orderId) => {
  assertObjectId(orderId, "order ID");
  const order = await Order.findById(orderId).lean();
  if (!order) throw httpError("Order not found", 404);
  const payment = order.paymentId ? await Payment.findById(order.paymentId).lean() : null;
  if (!payment || !REFUNDABLE.includes(payment.status)) throw httpError("Order has no refundable payment", 409);
  return { order, payment };
};

const allocationsFor = async (payment) => {
  let allocs = await Allocation.find({ paymentId: payment._id }).lean();
  if (!allocs.length) {
    await ensureFinancials(payment._id);
    allocs = await Allocation.find({ paymentId: payment._id }).lean();
  }
  return allocs;
};

const planSplits = (allocs, amountMinor, shopId) => {
  if (shopId) {
    const a = allocs.find((x) => String(x.shopId) === String(shopId));
    if (!a) throw httpError("Shop is not part of this order", 400);
    if (amountMinor > a.grossMinor - a.refundedGrossMinor - a.refundReservedMinor) throw httpError("Refund exceeds the shop's refundable amount", 400);
    return [{ shopId: String(a.shopId), amountMinor }];
  }
  const remaining = allocs.map((a) => a.grossMinor - a.refundedGrossMinor - a.refundReservedMinor);
  if (amountMinor > remaining.reduce((x, y) => x + y, 0)) throw httpError("Refund exceeds the refundable amount", 400);
  const parts = splitByWeights(amountMinor, remaining);
  return allocs.map((a, i) => ({ shopId: String(a.shopId), amountMinor: parts[i] })).filter((p) => p.amountMinor > 0);
};

// Reserve capacity on the payment and on each shop allocation with compare-and-set updates, so two
// concurrent refunds can never exceed what was paid.
const reserve = async (payment, amountMinor, shopId) => {
  let reserved = false;
  for (let i = 0; i < 5 && !reserved; i++) {
    const p = await Payment.findById(payment._id).lean();
    if (!REFUNDABLE.includes(p.status)) throw httpError("Payment is not refundable", 409);
    if (p.refundedMinor + p.refundReservedMinor + amountMinor > p.amountMinor) throw httpError("Refund exceeds the refundable amount", 400);
    reserved = Boolean(
      await Payment.findOneAndUpdate(
        { _id: p._id, refundReservedMinor: p.refundReservedMinor, refundedMinor: p.refundedMinor },
        { $inc: { refundReservedMinor: amountMinor } },
      ),
    );
  }
  if (!reserved) throw httpError("Payment changed concurrently, retry", 409);
  const done = [];
  try {
    const allocs = await allocationsFor(payment);
    const splits = planSplits(allocs, amountMinor, shopId);
    for (const sp of splits) {
      let ok = false;
      for (let i = 0; i < 5 && !ok; i++) {
        const a = await Allocation.findOne({ paymentId: payment._id, shopId: sp.shopId }).lean();
        if (sp.amountMinor > a.grossMinor - a.refundedGrossMinor - a.refundReservedMinor) throw httpError("Refund exceeds the shop's refundable amount", 400);
        ok = Boolean(
          await Allocation.findOneAndUpdate(
            { _id: a._id, refundReservedMinor: a.refundReservedMinor, refundedGrossMinor: a.refundedGrossMinor },
            { $inc: { refundReservedMinor: sp.amountMinor } },
          ),
        );
      }
      if (!ok) throw httpError("Allocation changed concurrently, retry", 409);
      done.push(sp);
    }
    return splits;
  } catch (e) {
    for (const sp of done) await Allocation.findOneAndUpdate({ paymentId: payment._id, shopId: sp.shopId }, { $inc: { refundReservedMinor: -sp.amountMinor } });
    await Payment.findOneAndUpdate({ _id: payment._id }, { $inc: { refundReservedMinor: -amountMinor } });
    throw e;
  }
};

const releaseReservation = async (refund) => {
  const won = await Refund.findOneAndUpdate({ _id: refund._id, reservedMinor: { $gt: 0 } }, { $set: { reservedMinor: 0 } });
  if (!won) return;
  for (const sp of refund.splits || []) await Allocation.findOneAndUpdate({ paymentId: refund.paymentId, shopId: sp.shopId }, { $inc: { refundReservedMinor: -sp.amountMinor } });
  await Payment.findOneAndUpdate({ _id: refund.paymentId }, { $inc: { refundReservedMinor: -refund.amountMinor } });
};

// Idempotent: every step is guarded by `appliedRefunds` and unique ledger keys.
export const applyRefundFinancials = async (refundId) => {
  const refund = await Refund.findById(refundId).lean();
  if (!refund || refund.status !== "processed") throw httpError("Refund is not processed", 409);
  const id = String(refund._id);
  for (const sp of refund.splits || []) {
    for (let i = 0; i < 5; i++) {
      const a = await Allocation.findOne({ paymentId: refund.paymentId, shopId: sp.shopId }).lean();
      if (a.appliedRefunds.includes(id)) break;
      const newGross = a.refundedGrossMinor + sp.amountMinor;
      const sellerCum = reversedShare(a.sellerShareMinor, newGross, a.grossMinor);
      const platCum = reversedShare(a.platformShareMinor, newGross, a.grossMinor);
      const upd = await Allocation.findOneAndUpdate(
        { _id: a._id, refundedGrossMinor: a.refundedGrossMinor, appliedRefunds: { $ne: id } },
        {
          $set: { refundedGrossMinor: newGross, sellerRefundedMinor: sellerCum, platformRefundedMinor: platCum },
          $inc: { refundReservedMinor: -sp.amountMinor },
          $push: { appliedRefunds: id },
        },
        { new: true },
      );
      if (upd) {
        const base = { orderId: refund.orderId, paymentId: refund.paymentId, refundId: refund._id, shopId: sp.shopId, sellerId: a.sellerId, state: a.accountingState, actorId: refund.initiatedBy };
        const rows = [
          ["refund", "gateway", "debit", sp.amountMinor, "refund"],
          ["seller_share_reversal", "seller", "debit", sellerCum - a.sellerRefundedMinor, "seller"],
          ["platform_share_reversal", "platform", "debit", platCum - a.platformRefundedMinor, "platform"],
        ];
        for (const [type, account, direction, amt, suffix] of rows) {
          if (amt > 0) await postEntry({ ...base, type, account, direction, amountMinor: amt, idempotencyKey: `refund:${id}:${sp.shopId}:${suffix}`, reference: refund.gatewayReference });
        }
        break;
      }
    }
  }
  const p0 = await Payment.findOneAndUpdate(
    { _id: refund.paymentId, appliedRefunds: { $ne: id } },
    { $inc: { refundedMinor: refund.amountMinor, refundReservedMinor: -refund.amountMinor }, $push: { appliedRefunds: id } },
    { new: true },
  );
  const p = p0 || (await Payment.findById(refund.paymentId).lean());
  const full = p.refundedMinor >= p.amountMinor;
  await Payment.updateOne({ _id: p._id }, { $set: { status: full ? "refunded" : "partially_refunded" } });
  await Order.updateOne(
    { _id: refund.orderId },
    { $set: { refundedMinor: p.refundedMinor, paymentStatus: full ? "refunded" : "partially_refunded", ...(full ? { status: "refunded" } : {}) } },
  );
  await Refund.updateOne({ _id: refund._id }, { $set: { financialsApplied: true, reservedMinor: 0 } });
  return Refund.findById(refund._id).lean();
};

export const serializeRefund = (r) => ({
  id: String(r._id),
  orderId: String(r.orderId),
  paymentId: r.paymentId ? String(r.paymentId) : null,
  shopId: r.shopId ? String(r.shopId) : null,
  amountMinor: r.amountMinor,
  reason: r.reason,
  status: r.status,
  method: r.method,
  gatewayReference: r.gatewayReference,
  gatewayMessage: r.gatewayMessage,
  failureReason: r.failureReason,
  needsReconciliation: r.needsReconciliation,
  initiatedBy: r.initiatedBy,
  initiatorRole: r.initiatorRole,
  requestedBy: r.requestedBy,
  processedAt: r.processedAt,
  createdAt: r.createdAt,
});

const cleanReason = (reason) => {
  const r = String(reason || "").trim();
  if (r.length < 3 || r.length > 500) throw httpError("A refund reason (3-500 characters) is required", 400);
  return r;
};

// Customer asks; nothing is paid out until staff processes it.
export const requestRefund = async (user, orderId, { amountMinor, reason, shopId = null }) => {
  const { order, payment } = await loadPaidPayment(orderId);
  if (order.customerId !== user.id) throw httpError("Order not found", 404);
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw httpError("Invalid refund amount", 400);
  if (payment.refundedMinor + payment.refundReservedMinor + amountMinor > payment.amountMinor) throw httpError("Refund exceeds the refundable amount", 400);
  const open = await Refund.findOne({ orderId: order._id, status: "requested" }).lean();
  if (open) throw httpError("A refund request is already open for this order", 409);
  const r = await Refund.create({
    orderId: order._id, paymentId: payment._id, shopId, amount: minorToPkr(amountMinor), amountMinor,
    reason: cleanReason(reason), status: "requested", requestedBy: user.id,
  });
  return serializeRefund(r.toObject ? r.toObject() : r);
};

const execute = async (refund, actor, ip, { manualReference = null } = {}) => {
  const payment = await Payment.findById(refund.paymentId).lean();
  const method = payment.provider === "payfast" ? "gateway" : "manual";
  if (method === "manual" && !(manualReference && String(manualReference).trim().length >= 3))
    throw httpError("COD refunds are recorded manually and require a manualReference (e.g. bank transfer or receipt number)", 400);
  const moved = await Refund.findOneAndUpdate(
    { _id: refund._id, status: { $in: ["requested", "approved"] } },
    { $set: { status: "processing", method, initiatedBy: actor.id, initiatorRole: actor.role } },
    { new: true },
  ).lean();
  if (!moved) throw httpError("Refund is already being processed or finished", 409);
  let splits;
  try {
    splits = await reserve(payment, moved.amountMinor, moved.shopId);
  } catch (e) {
    await Refund.updateOne({ _id: moved._id }, { $set: { status: "failed", failureReason: e.message } });
    throw e;
  }
  await Refund.updateOne({ _id: moved._id }, { $set: { splits, reservedMinor: moved.amountMinor } });
  const cur = await Refund.findById(moved._id).lean();

  if (method === "manual") return finishSuccess(cur, { gatewayReference: String(manualReference).trim(), message: "Recorded manually" }, actor);

  let r;
  try {
    r = await pf.refundTransaction({ ip, transactionId: payment.providerReference, amount: formatMinor(cur.amountMinor), reason: cur.reason });
  } catch {
    await Refund.updateOne({ _id: cur._id }, { $set: { needsReconciliation: true, failureReason: "Gateway outcome unknown" } });
    return { refund: serializeRefund(await Refund.findById(cur._id).lean()), outcome: "unknown" };
  }
  if (r.ok && pf.SUCCESS_CODES.has(r.code)) return finishSuccess(cur, { gatewayReference: r.transactionId || payment.providerReference, code: r.code, message: r.message }, actor);
  if (r.code && r.httpStatus < 500) {
    await Refund.updateOne({ _id: cur._id }, { $set: { status: "failed", gatewayCode: r.code, gatewayMessage: String(r.message || "").slice(0, 200), failureReason: "Rejected by gateway" } });
    await releaseReservation(cur);
    return { refund: serializeRefund(await Refund.findById(cur._id).lean()), outcome: "failed" };
  }
  await Refund.updateOne({ _id: cur._id }, { $set: { needsReconciliation: true, gatewayCode: r.code, failureReason: "Gateway outcome unknown" } });
  return { refund: serializeRefund(await Refund.findById(cur._id).lean()), outcome: "unknown" };
};

const finishSuccess = async (refund, { gatewayReference, code = null, message = null }, actor) => {
  const won = await Refund.findOneAndUpdate(
    { _id: refund._id, status: "processing" },
    { $set: { status: "processed", processedAt: new Date(), gatewayReference, gatewayCode: code, gatewayMessage: message ? String(message).slice(0, 200) : null, needsReconciliation: false, failureReason: null } },
    { new: true },
  ).lean();
  if (!won) throw httpError("Refund state changed concurrently", 409);
  const applied = await applyRefundFinancials(refund._id);
  await safeAudit({ actor, action: "REFUND_PROCESSED", resourceType: "refund", resourceId: refund._id, reason: refund.reason, metadata: { orderId: String(refund.orderId), amountMinor: refund.amountMinor, method: won.method } });
  return { refund: serializeRefund(applied), outcome: "processed" };
};

export const createRefund = async (actor, ip, { orderId, amountMinor, reason, shopId = null, requestId = null, manualReference = null }) => {
  assertStaffPermission(actor, "payments.refund");
  const { order, payment } = await loadPaidPayment(orderId);
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw httpError("Invalid refund amount", 400);
  if (shopId) assertObjectId(shopId, "shop ID");
  if (requestId) {
    const dup = await Refund.findOne({ paymentId: payment._id, requestId }).lean();
    if (dup) return { refund: serializeRefund(dup), outcome: dup.status, replay: true };
  }
  let r;
  try {
    r = await Refund.create({
      orderId: order._id, paymentId: payment._id, shopId, amount: minorToPkr(amountMinor), amountMinor,
      reason: cleanReason(reason), status: "approved", initiatedBy: actor.id, initiatorRole: actor.role, requestId,
    });
  } catch (e) {
    if (!isDup(e)) throw e;
    const dup = await Refund.findOne({ paymentId: payment._id, requestId }).lean();
    return { refund: serializeRefund(dup), outcome: dup.status, replay: true };
  }
  await safeAudit({ actor, action: "REFUND_CREATED", resourceType: "refund", resourceId: r._id, reason: reason, metadata: { orderId, amountMinor } });
  return execute(r.toObject ? r.toObject() : r, actor, ip, { manualReference });
};

export const processRefund = async (actor, ip, refundId, { manualReference = null } = {}) => {
  assertStaffPermission(actor, "payments.refund");
  assertObjectId(refundId, "refund ID");
  const r = await Refund.findById(refundId).lean();
  if (!r) throw httpError("Refund not found", 404);
  if (r.status !== "requested") throw httpError("Only requested refunds can be processed", 409);
  return execute(r, actor, ip, { manualReference });
};

export const rejectRefund = async (actor, refundId, note = "") => {
  assertStaffPermission(actor, "payments.refund");
  assertObjectId(refundId, "refund ID");
  const r = await Refund.findOneAndUpdate(
    { _id: refundId, status: "requested" },
    { $set: { status: "rejected", failureReason: String(note).slice(0, 500), initiatedBy: actor.id, initiatorRole: actor.role } },
    { new: true },
  ).lean();
  if (!r) throw httpError("Refund request not found or already handled", 404);
  await safeAudit({ actor, action: "REFUND_REJECTED", resourceType: "refund", resourceId: r._id, reason: note });
  return serializeRefund(r);
};

// An admin checked the PayFast merchant portal and tells us what really happened.
export const reconcileRefund = async (actor, refundId, { outcome, gatewayReference = null }) => {
  assertStaffPermission(actor, "payments.refund");
  assertObjectId(refundId, "refund ID");
  const r = await Refund.findById(refundId).lean();
  if (!r) throw httpError("Refund not found", 404);
  if (r.status === "processed" && !r.financialsApplied && outcome === "processed") return { refund: serializeRefund(await applyRefundFinancials(r._id)), outcome: "processed" };
  if (r.status !== "processing" || !r.needsReconciliation) throw httpError("Refund does not need reconciliation", 409);
  if (outcome === "processed") {
    if (!gatewayReference) throw httpError("gatewayReference is required to confirm a processed refund", 400);
    return finishSuccess(r, { gatewayReference }, actor);
  }
  await Refund.updateOne({ _id: r._id }, { $set: { status: "failed", failureReason: "Marked failed after manual reconciliation", needsReconciliation: false } });
  await releaseReservation(r);
  await safeAudit({ actor, action: "REFUND_RECONCILED_FAILED", resourceType: "refund", resourceId: r._id });
  return { refund: serializeRefund(await Refund.findById(r._id).lean()), outcome: "failed" };
};

export const listRefunds = async (filter, q) => {
  const p = parsePage(q);
  const f = { ...filter };
  if (q.status) f.status = String(q.status);
  const [rows, total] = await Promise.all([Refund.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(), Refund.countDocuments(f)]);
  return { data: rows.map(serializeRefund), pagination: pageMeta(p, total) };
};
