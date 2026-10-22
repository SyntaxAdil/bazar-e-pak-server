import Allocation from "./allocation.model.js";
import Ledger from "./ledger.model.js";
import Payment from "./payment.model.js";
import Order from "./order.model.js";
import Shop from "../shops/shop.model.js";
import { serializePayment } from "./payment.service.js";
import { serializeOrder } from "./order.service.js";
import { httpError, assertObjectId, assertStaffPermission, getOwnedShop, parsePage, pageMeta } from "./access.js";

const sum = (rows, f) => rows.reduce((t, r) => t + f(r), 0);

export const serializeAllocation = (a) => ({
  id: String(a._id),
  orderId: String(a.orderId),
  paymentId: String(a.paymentId),
  basketId: a.basketId,
  shopId: String(a.shopId),
  paymentMethod: a.paymentMethod,
  grossMinor: a.grossMinor,
  gatewayFeeMinor: a.gatewayFeeMinor,
  distributableMinor: a.distributableMinor,
  sellerShareMinor: a.sellerShareMinor,
  platformShareMinor: a.platformShareMinor,
  sellerBps: a.sellerBps,
  platformBps: a.platformBps,
  accountingState: a.accountingState,
  feeSource: a.feeSource,
  refundedGrossMinor: a.refundedGrossMinor,
  sellerRefundedMinor: a.sellerRefundedMinor,
  platformRefundedMinor: a.platformRefundedMinor,
  settlementStatus: a.settlementStatus,
  settlementReference: a.settlementReference,
  settledAmountMinor: a.settledAmountMinor,
  settledAt: a.settledAt,
  createdAt: a.createdAt,
});

export const shopSummary = async (shopId) => {
  const allocs = await Allocation.find({ shopId }).lean();
  const online = allocs.filter((a) => a.paymentMethod === "payfast");
  const cod = allocs.filter((a) => a.paymentMethod === "cod");
  const net = (a) => a.sellerShareMinor - a.sellerRefundedMinor;
  const unsettledOnline = online.filter((a) => a.settlementStatus !== "settled");
  return {
    currency: "PKR",
    orders: allocs.length,
    grossMinor: sum(allocs, (a) => a.grossMinor),
    refundedGrossMinor: sum(allocs, (a) => a.refundedGrossMinor),
    gatewayFeeMinor: sum(allocs, (a) => a.gatewayFeeMinor),
    sellerShareMinor: sum(allocs, net),
    platformShareMinor: sum(allocs, (a) => a.platformShareMinor - a.platformRefundedMinor),
    provisionalAllocations: allocs.filter((a) => a.accountingState === "provisional").length,
    online: {
      sellerPayableMinor: sum(unsettledOnline.filter((a) => a.accountingState === "final"), net),
      sellerPendingFeeFinalisationMinor: sum(unsettledOnline.filter((a) => a.accountingState === "provisional"), net),
      sellerSettledMinor: sum(online.filter((a) => a.settlementStatus === "settled"), (a) => a.settledAmountMinor),
      // refunds issued after payout create an amount the seller owes back
      sellerClawbackMinor: sum(online.filter((a) => a.settlementStatus === "settled"), (a) => Math.max(0, a.settledAmountMinor - net(a))),
    },
    cod: { // cash is collected outside PayFast; PakBazaar's share must be reconciled manually
      sellerShareMinor: sum(cod, net),
      platformReceivableMinor: sum(cod, (a) => a.platformShareMinor - a.platformRefundedMinor),
    },
  };
};

// access scope: seller -> own shop only (identity-derived); admin -> any shop with permission
export const resolveShopScope = async (user, shopIdParam) => {
  if (user.role === "seller") return { shop: await getOwnedShop(user) };
  assertStaffPermission(user, "payments.view");
  assertObjectId(shopIdParam, "shop ID");
  const shop = await Shop.findOne({ _id: shopIdParam, isDeleted: false }).lean();
  if (!shop) throw httpError("Shop not found", 404);
  return { shop };
};

export const shopOrders = async (shopId, q) => {
  const p = parsePage(q);
  const f = { shopIds: shopId };
  for (const k of ["status", "paymentStatus", "paymentMethod"]) if (q[k]) f[k] = String(q[k]);
  const [rows, total] = await Promise.all([Order.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(), Order.countDocuments(f)]);
  return { data: rows.map((o) => serializeOrder(o, { shopId })), pagination: pageMeta(p, total) };
};

export const shopAllocations = async (shopId, q) => {
  const p = parsePage(q);
  const f = { shopId };
  for (const k of ["accountingState", "settlementStatus", "paymentMethod"]) if (q[k]) f[k] = String(q[k]);
  const [rows, total] = await Promise.all([Allocation.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(), Allocation.countDocuments(f)]);
  return { data: rows.map(serializeAllocation), pagination: pageMeta(p, total) };
};

// ledger rows for a shop. Sellers never see PakBazaar-internal accounts or the gateway account.
export const shopLedger = async (shopId, q, { seller = false } = {}) => {
  const p = parsePage(q);
  const f = { shopId };
  if (seller) f.account = "seller";
  if (q.type) f.type = String(q.type);
  const [rows, total] = await Promise.all([Ledger.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(), Ledger.countDocuments(f)]);
  return {
    data: rows.map((l) => ({ id: String(l._id), type: l.type, account: l.account, direction: l.direction, amountMinor: l.amountMinor, currency: l.currency, state: l.state, orderId: l.orderId ? String(l.orderId) : null, paymentId: l.paymentId ? String(l.paymentId) : null, refundId: l.refundId ? String(l.refundId) : null, settlementId: l.settlementId ? String(l.settlementId) : null, reference: l.reference, createdAt: l.createdAt })),
    pagination: pageMeta(p, total),
  };
};

export const listShops = async (q) => {
  const p = parsePage(q);
  const f = { isDeleted: false };
  if (q.status) f.status = String(q.status);
  if (q.search) f.name = { $regex: String(q.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60), $options: "i" };
  const [rows, total] = await Promise.all([Shop.find(f).select("_id name slug status sellerId source city").sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(), Shop.countDocuments(f)]);
  const data = [];
  for (const s of rows) data.push({ id: String(s._id), name: s.name, slug: s.slug, status: s.status, source: s.source, city: s.city, sellerId: s.sellerId ? String(s.sellerId) : null, summary: await shopSummary(s._id) });
  return { data, pagination: pageMeta(p, total) };
};

export const listPayments = async (q) => {
  const p = parsePage(q);
  const f = {};
  for (const k of ["status", "provider", "orderId"]) if (q[k]) f[k] = String(q[k]);
  if (f.orderId) assertObjectId(f.orderId, "order ID");
  const [rows, total] = await Promise.all([Payment.find(f).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(), Payment.countDocuments(f)]);
  return { data: rows.map((x) => serializePayment(x, { staff: true })), pagination: pageMeta(p, total) };
};
