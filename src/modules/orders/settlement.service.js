import Settlement from "./settlement.model.js";
import Allocation from "./allocation.model.js";
import Shop from "../shops/shop.model.js";
import { postEntry } from "./ledger.service.js";
import { minorToPkr } from "./money.js";
import { httpError, assertObjectId, assertStaffPermission, parsePage, pageMeta } from "./access.js";
import { safeAudit } from "../../utils/audit.js";

const payable = (a) => a.sellerShareMinor - a.sellerRefundedMinor;

export const serializeSettlement = (s) => ({
  id: String(s._id),
  shopId: s.shopId ? String(s.shopId) : null,
  sellerId: s.sellerId,
  status: s.status,
  grossMinor: s.grossMinor,
  platformShareMinor: s.platformShareMinor,
  netMinor: s.netMinor,
  currency: s.currency,
  reference: s.reference,
  note: s.note,
  allocationCount: (s.allocationIds || []).length,
  orderCount: (s.orderIds || []).length,
  createdBy: s.createdBy,
  paidAt: s.paidAt,
  createdAt: s.createdAt,
});

// Settlement TRACKING only. Eligible = online (PayFast) payments with a FINAL gateway fee and
// no refund in flight. COD cash never flows through PayFast, so it is excluded.
export const createSettlement = async (actor, { shopId, note = "" }) => {
  assertStaffPermission(actor, "settlements.manage");
  assertObjectId(shopId, "shop ID");
  const shop = await Shop.findOne({ _id: shopId, isDeleted: false }).select("_id sellerId").lean();
  if (!shop || !shop.sellerId) throw httpError("Shop not found or has no seller", 404);
  const eligible = (await Allocation.find({ shopId, settlementStatus: "unsettled", accountingState: "final", paymentMethod: "payfast", refundReservedMinor: 0 }).lean()).filter((a) => payable(a) > 0);
  if (!eligible.length) throw httpError("No eligible allocations to settle (they need a finalised gateway fee)", 409);
  const claimed = [];
  const draft = await Settlement.create({ sellerId: String(shop.sellerId), shopId, status: "pending", createdBy: actor.id, note: String(note).slice(0, 500) });
  for (const a of eligible) {
    const ok = await Allocation.findOneAndUpdate(
      { _id: a._id, settlementStatus: "unsettled", refundedGrossMinor: a.refundedGrossMinor, refundReservedMinor: 0 },
      { $set: { settlementStatus: "included", settlementId: draft._id } },
      { new: true },
    ).lean();
    if (ok) claimed.push(ok);
  }
  if (!claimed.length) {
    await Settlement.updateOne({ _id: draft._id }, { $set: { status: "failed", note: "nothing claimed" } });
    throw httpError("Allocations changed concurrently, retry", 409);
  }
  const netMinor = claimed.reduce((s, a) => s + payable(a), 0);
  const grossMinor = claimed.reduce((s, a) => s + a.grossMinor - a.refundedGrossMinor, 0);
  const platformShareMinor = claimed.reduce((s, a) => s + a.platformShareMinor - a.platformRefundedMinor, 0);
  const s = await Settlement.findOneAndUpdate(
    { _id: draft._id },
    {
      $set: {
        allocationIds: claimed.map((a) => a._id),
        orderIds: [...new Set(claimed.map((a) => String(a.orderId)))],
        grossMinor, platformShareMinor, netMinor,
        grossAmount: minorToPkr(grossMinor), commissionAmount: minorToPkr(platformShareMinor), netAmount: minorToPkr(netMinor),
      },
    },
    { new: true },
  ).lean();
  await safeAudit({ actor, action: "SETTLEMENT_CREATED", resourceType: "settlement", resourceId: s._id, metadata: { shopId: String(shopId), netMinor } });
  return serializeSettlement(s);
};

// Records that an ADMIN paid the seller out-of-band (bank transfer). No payout API is called.
export const updateSettlementStatus = async (actor, settlementId, { status, reference = null, note = "" }) => {
  assertStaffPermission(actor, "settlements.manage");
  assertObjectId(settlementId, "settlement ID");
  const s = await Settlement.findById(settlementId).lean();
  if (!s) throw httpError("Settlement not found", 404);
  const allowed = { pending: ["processing", "paid", "failed"], processing: ["paid", "failed"] };
  if (!(allowed[s.status] || []).includes(status)) throw httpError(`Cannot move settlement from ${s.status} to ${status}`, 409);
  if (status === "paid") {
    if (!reference || String(reference).trim().length < 3) throw httpError("A payout reference (bank transfer id) is required to mark a settlement paid", 400);
    const allocs = await Allocation.find({ settlementId: s._id }).lean();
    if (allocs.reduce((t, a) => t + payable(a), 0) !== s.netMinor) throw httpError("Amounts changed after creation (refund). Cancel and recreate the settlement.", 409);
  }
  const won = await Settlement.findOneAndUpdate(
    { _id: s._id, status: s.status },
    { $set: { status, updatedBy: actor.id, ...(note ? { note: String(note).slice(0, 500) } : {}), ...(reference ? { reference: String(reference).trim() } : {}), ...(status === "paid" ? { paidAt: new Date() } : {}) } },
    { new: true },
  ).lean();
  if (!won) throw httpError("Settlement changed concurrently", 409);
  if (status === "paid") {
    const allocs = await Allocation.find({ settlementId: s._id }).lean();
    for (const a of allocs) {
      await Allocation.updateOne({ _id: a._id }, { $set: { settlementStatus: "settled", settlementReference: won.reference, settledAmountMinor: payable(a), settledAt: won.paidAt } });
      if (payable(a) > 0)
        await postEntry({ idempotencyKey: `settle:${s._id}:${a.shopId}:${a._id}`, type: "settlement", account: "seller", direction: "debit", amountMinor: payable(a), state: "final", orderId: a.orderId, paymentId: a.paymentId, shopId: a.shopId, sellerId: a.sellerId, settlementId: s._id, reference: won.reference, actorId: actor.id });
    }
  }
  if (status === "failed") await Allocation.updateMany({ settlementId: s._id, settlementStatus: "included" }, { $set: { settlementStatus: "unsettled", settlementId: null } });
  await safeAudit({ actor, action: "SETTLEMENT_STATUS_CHANGED", resourceType: "settlement", resourceId: s._id, previousState: { status: s.status }, newState: { status }, metadata: { reference: won.reference } });
  return serializeSettlement(won);
};

export const listSettlements = async (filter, q) => {
  const p = parsePage(q);
  const f = { ...filter };
  if (q.status) f.status = String(q.status);
  const [rows, total] = await Promise.all([Settlement.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(), Settlement.countDocuments(f)]);
  return { data: rows.map(serializeSettlement), pagination: pageMeta(p, total) };
};
