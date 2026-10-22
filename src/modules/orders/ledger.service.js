import Allocation from "./allocation.model.js";
import Ledger from "./ledger.model.js";
import Payment from "./payment.model.js";
import Order from "./order.model.js";
import Shop from "../shops/shop.model.js";
import { env } from "../../config/env.js";
import { computeAllocations, mulDivFloor, BPS_TOTAL, SELLER_BPS } from "./money.js";
import { httpError } from "./access.js";

const isDup = (e) => e?.code === 11000;

// Append a ledger entry; a duplicate idempotencyKey is a harmless retry.
export const postEntry = async (entry) => {
  try {
    return await Ledger.create({ currency: "PKR", ...entry });
  } catch (e) {
    if (isDup(e)) return null;
    throw e;
  }
};

const entry = (base, type, account, direction, amountMinor, suffix, extra = {}) =>
  amountMinor > 0 || type === "charge"
    ? { ...base, type, account, direction, amountMinor, idempotencyKey: `${base.keyPrefix}:${suffix}`, ...extra }
    : null;

export const estimatedFeeMinor = (grossMinor) => mulDivFloor(grossMinor, env.PAYFAST_ESTIMATED_FEE_BPS, BPS_TOTAL);

export const shopGrossFromOrder = (order) => {
  const map = new Map();
  for (const it of order.items) {
    const k = String(it.shopId);
    map.set(k, (map.get(k) || 0) + (it.lineTotalMinor ?? Math.round(it.lineTotal * 100)));
  }
  return [...map.entries()].map(([shopId, grossMinor]) => ({ shopId, grossMinor }));
};

// Idempotent: creates allocations + ledger entries for a PAID payment. Safe to call repeatedly
// (retries, repeated callbacks, crash recovery).
export const ensureFinancials = async (paymentId) => {
  const payment = await Payment.findById(paymentId).lean();
  if (!payment || !["paid", "partially_refunded", "refunded"].includes(payment.status)) return [];
  const order = await Order.findById(payment.orderId).lean();
  if (!order) throw httpError("Order not found for payment", 500);
  const shops = shopGrossFromOrder(order);
  const shopDocs = await Shop.find({ _id: { $in: shops.map((s) => s.shopId) } }).select("_id sellerId").lean();
  const sellerOf = new Map(shopDocs.map((s) => [String(s._id), s.sellerId ? String(s.sellerId) : null]));
  const withBps = shops.map((s) => ({ ...s, sellerBps: sellerOf.get(s.shopId) ? SELLER_BPS : 0 }));
  const feeMinor = payment.gatewayFeeMinor ?? 0;
  const calc = computeAllocations(withBps, feeMinor);
  const final = payment.feeSource === "actual";
  const out = [];
  for (const a of calc) {
    let alloc = await Allocation.findOne({ orderId: order._id, shopId: a.shopId }).lean();
    if (!alloc) {
      try {
        alloc = (
          await Allocation.create({
            orderId: order._id,
            paymentId: payment._id,
            basketId: payment.basketId,
            shopId: a.shopId,
            sellerId: sellerOf.get(String(a.shopId)),
            customerId: order.customerId,
            paymentMethod: payment.provider || payment.method,
            ...a,
            accountingState: final ? "final" : "provisional",
            feeSource: payment.feeSource,
          })
        ).toObject();
      } catch (e) {
        if (!isDup(e)) throw e;
        alloc = await Allocation.findOne({ orderId: order._id, shopId: a.shopId }).lean();
      }
    }
    const base = {
      keyPrefix: `pay:${payment._id}:${a.shopId}`,
      orderId: order._id,
      paymentId: payment._id,
      shopId: a.shopId,
      sellerId: alloc.sellerId,
      state: alloc.accountingState,
    };
    const rows = [
      entry(base, "charge", "gateway", "credit", alloc.grossMinor, "charge", { reference: payment.providerReference }),
      entry(base, "gateway_fee", "gateway", "debit", alloc.gatewayFeeMinor, "fee"),
      entry(base, "seller_share", "seller", "credit", alloc.sellerShareMinor, "seller"),
      entry(base, "platform_share", "platform", "credit", alloc.platformShareMinor, "platform"),
    ].filter(Boolean);
    for (const r of rows) {
      const { keyPrefix, ...rest } = r;
      await postEntry(rest);
    }
    out.push(alloc);
  }
  return out;
};

// Admin records the ACTUAL gateway fee (PayFast exposes no fee API). Recomputes shares, posts
// delta ledger entries and flips the accounting state provisional -> final.
export const setActualGatewayFee = async ({ paymentId, feeMinor, reference = null, actor }) => {
  if (!Number.isInteger(feeMinor) || feeMinor < 0) throw httpError("Invalid gateway fee");
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) throw httpError("Payment not found", 404);
  if (!["paid", "partially_refunded", "refunded"].includes(payment.status)) throw httpError("Payment is not paid", 409);
  if (feeMinor > payment.amountMinor) throw httpError("Gateway fee exceeds payment amount");
  await ensureFinancials(paymentId);
  const allocs = await Allocation.find({ paymentId: payment._id }).lean();
  if (allocs.some((a) => a.refundedGrossMinor > 0 || a.refundReservedMinor > 0 || a.settlementStatus !== "unsettled"))
    throw httpError("Fee cannot be changed after a refund or settlement exists for this payment", 409);
  const calc = computeAllocations(
    allocs.map((a) => ({ shopId: String(a.shopId), grossMinor: a.grossMinor, sellerBps: a.sellerBps })),
    feeMinor,
  );
  for (const n of calc) {
    const cur = allocs.find((a) => String(a.shopId) === String(n.shopId));
    const updated = await Allocation.findOneAndUpdate(
      { _id: cur._id, gatewayFeeMinor: cur.gatewayFeeMinor, refundedGrossMinor: 0, settlementStatus: "unsettled" },
      {
        $set: {
          gatewayFeeMinor: n.gatewayFeeMinor,
          distributableMinor: n.distributableMinor,
          sellerShareMinor: n.sellerShareMinor,
          platformShareMinor: n.platformShareMinor,
          accountingState: "final",
          feeSource: "actual",
        },
      },
      { new: true },
    );
    if (!updated) throw httpError("Allocation changed concurrently, retry", 409);
    const base = { keyPrefix: `feefinal:${payment._id}:${n.shopId}:${cur.gatewayFeeMinor}-${n.gatewayFeeMinor}`, orderId: payment.orderId, paymentId: payment._id, shopId: n.shopId, sellerId: cur.sellerId, state: "final", actorId: actor?.id ?? null, reference };
    const deltas = [
      ["fee_adjustment", "gateway", n.gatewayFeeMinor - cur.gatewayFeeMinor, true],
      ["seller_share", "seller", n.sellerShareMinor - cur.sellerShareMinor, false],
      ["platform_share", "platform", n.platformShareMinor - cur.platformShareMinor, false],
    ];
    for (const [type, account, d, feeIsDebit] of deltas) {
      if (d === 0) continue;
      const direction = feeIsDebit ? (d > 0 ? "debit" : "credit") : d > 0 ? "credit" : "debit";
      const { keyPrefix, ...rest } = entry(base, type, account, direction, Math.abs(d), type);
      await postEntry({ ...rest, note: "gateway fee finalised" });
    }
  }
  await Payment.findOneAndUpdate({ _id: payment._id }, { $set: { gatewayFeeMinor: feeMinor, feeSource: "actual" } });
  return Allocation.find({ paymentId: payment._id }).lean();
};

export const validateLedgerConsistency = (alloc) => {
  const problems = [];
  if (alloc.grossMinor - alloc.gatewayFeeMinor !== alloc.distributableMinor) problems.push("distributable mismatch");
  if (alloc.sellerShareMinor + alloc.platformShareMinor !== alloc.distributableMinor) problems.push("share sum mismatch");
  return problems;
};
