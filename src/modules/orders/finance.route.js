import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { checkPermissionMiddleware } from "../../utils/permissions.js";
import { h, send, sendPage } from "./http.js";
import * as V from "./order.validation.js";
import Shop from "../shops/shop.model.js";
import Payment from "./payment.model.js";
import Allocation from "./allocation.model.js";
import Refund from "./refund.model.js";
import { clientIp } from "./payfast.client.js";
import { verifyPayment, serializePayment } from "./payment.service.js";
import { markCodCollected, expireStaleOrders } from "./order.service.js";
import { createRefund, processRefund, rejectRefund, reconcileRefund, listRefunds } from "./refund.service.js";
import { createSettlement, updateSettlementStatus, listSettlements } from "./settlement.service.js";
import { setActualGatewayFee } from "./ledger.service.js";
import { reviewProof } from "./proof.service.js";
import { shopSummary, resolveShopScope, shopOrders, shopAllocations, shopLedger, listShops, listPayments, serializeAllocation } from "./finance.service.js";
import { assertObjectId, httpError, parsePage, getOwnedShop } from "./access.js";

const router = Router();
router.use(authMiddleware);

const seller = checkRoleMiddleware("seller");
const staff = checkRoleMiddleware(["admin", "super_admin"]);
const perm = (p) => [staff, checkPermissionMiddleware(p)];

// ---------------- Seller dashboard (shop derived from the authenticated identity) ----------------
router.get("/seller/summary", seller, h(async (req, res) => {
  const { shop } = await resolveShopScope(req.user);
  send(res, { shop: { id: String(shop._id), name: shop.name, slug: shop.slug }, ...(await shopSummary(shop._id)) }, { message: "Seller finance summary" });
}));
router.get("/seller/orders", seller, h(async (req, res) => sendPage(res, await shopOrders((await resolveShopScope(req.user)).shop._id, req.query))));
router.get("/seller/allocations", seller, h(async (req, res) => sendPage(res, await shopAllocations((await resolveShopScope(req.user)).shop._id, req.query))));
router.get("/seller/transactions", seller, h(async (req, res) => sendPage(res, await shopLedger((await resolveShopScope(req.user)).shop._id, req.query, { seller: true }))));
router.get("/seller/settlements", seller, h(async (req, res) => sendPage(res, await listSettlements({ shopId: (await resolveShopScope(req.user)).shop._id }, req.query))));
router.get("/seller/refunds", seller, h(async (req, res) => {
  const { shop } = await resolveShopScope(req.user);
  const r = await listRefunds({ $or: [{ "splits.shopId": shop._id }, { shopId: shop._id }] }, req.query);
  sendPage(res, r);
}));

// ---------------- Admin / super_admin ----------------
router.get("/admin/shops", ...perm("payments.view"), h(async (req, res) => sendPage(res, await listShops(req.query), "Shops with finance summary")));
router.get("/admin/shops/:shopId", ...perm("payments.view"), h(async (req, res) => {
  const { shop } = await resolveShopScope(req.user, req.params.shopId);
  const profile = { id: String(shop._id), name: shop.name, slug: shop.slug, status: shop.status, source: shop.source, sellerId: shop.sellerId ? String(shop.sellerId) : null, phone: shop.phone, email: shop.email, address: shop.address, city: shop.city, createdAt: shop.createdAt };
  send(res, { shop: profile, summary: await shopSummary(shop._id) }, { message: "Shop finance profile" });
}));
const shopScoped = (fn) => h(async (req, res) => sendPage(res, await fn((await resolveShopScope(req.user, req.params.shopId)).shop._id, req.query, req)));
router.get("/admin/shops/:shopId/orders", ...perm("payments.view"), shopScoped(shopOrders));
router.get("/admin/shops/:shopId/allocations", ...perm("payments.view"), shopScoped(shopAllocations));
router.get("/admin/shops/:shopId/transactions", ...perm("payments.view"), shopScoped((id, q) => shopLedger(id, q)));
router.get("/admin/shops/:shopId/settlements", ...perm("payments.view"), shopScoped((id, q) => listSettlements({ shopId: id }, q)));
router.get("/admin/shops/:shopId/refunds", ...perm("payments.view"), shopScoped((id, q) => listRefunds({ $or: [{ "splits.shopId": id }, { shopId: id }] }, q)));

router.get("/admin/payments", ...perm("payments.view"), h(async (req, res) => sendPage(res, await listPayments(req.query), "Payments")));
router.get("/admin/payments/:paymentId", ...perm("payments.view"), h(async (req, res) => {
  assertObjectId(req.params.paymentId, "payment ID");
  const p = await Payment.findById(req.params.paymentId).lean();
  if (!p) throw httpError("Payment not found", 404);
  const allocs = await Allocation.find({ paymentId: p._id }).lean();
  send(res, { payment: serializePayment(p, { staff: true }), allocations: allocs.map(serializeAllocation) }, { message: "Payment detail" });
}));
// re-check with the gateway; unlike the customer poll this may recover a payment wrongly marked failed/timed out
router.post("/admin/payments/:paymentId/verify", ...perm("payments.manage"), h(async (req, res) => {
  assertObjectId(req.params.paymentId, "payment ID");
  send(res, await verifyPayment(req.params.paymentId, clientIp(req), { allowRecover: true }), { message: "Payment verified" });
}));
router.post("/admin/payments/:paymentId/gateway-fee", ...perm("payments.manage"), h(async (req, res) => {
  const b = V.parse(V.feeSchema, req.body);
  assertObjectId(req.params.paymentId, "payment ID");
  const allocs = await setActualGatewayFee({ paymentId: req.params.paymentId, feeMinor: b.gatewayFee, reference: b.reference, actor: req.user });
  send(res, allocs.map(serializeAllocation), { message: "Gateway fee finalised" });
}));

router.post("/admin/orders/:orderId/cod-collected", ...perm("payments.manage"), h(async (req, res) => send(res, await markCodCollected(req.user, req.params.orderId), { message: "COD collection recorded" })));
router.post("/admin/orders/:orderId/refunds", ...perm("payments.refund"), h(async (req, res) => {
  const b = V.parse(V.refundCreateSchema, req.body);
  const r = await createRefund(req.user, clientIp(req), { orderId: req.params.orderId, amountMinor: b.amount, reason: b.reason, shopId: b.shopId, requestId: b.requestId, manualReference: b.manualReference });
  send(res, r, { status: r.outcome === "processed" ? 201 : 202, message: `Refund ${r.outcome}` });
}));

router.get("/admin/refunds", ...perm("payments.view"), h(async (req, res) => sendPage(res, await listRefunds({}, req.query), "Refunds")));
router.post("/admin/refunds/:refundId/process", ...perm("payments.refund"), h(async (req, res) => send(res, await processRefund(req.user, clientIp(req), req.params.refundId, V.parse(V.refundProcessSchema, req.body)), { message: "Refund processed" })));
router.post("/admin/refunds/:refundId/reject", ...perm("payments.refund"), h(async (req, res) => send(res, await rejectRefund(req.user, req.params.refundId, V.parse(V.refundRejectSchema, req.body).note), { message: "Refund rejected" })));
router.post("/admin/refunds/:refundId/reconcile", ...perm("payments.refund"), h(async (req, res) => send(res, await reconcileRefund(req.user, req.params.refundId, V.parse(V.refundReconcileSchema, req.body)), { message: "Refund reconciled" })));

router.get("/admin/settlements", ...perm("payments.view"), h(async (req, res) => sendPage(res, await listSettlements({}, req.query), "Settlements")));
router.post("/admin/settlements", ...perm("settlements.manage"), h(async (req, res) => send(res, await createSettlement(req.user, V.parse(V.settlementCreateSchema, req.body)), { status: 201, message: "Settlement created" })));
router.patch("/admin/settlements/:settlementId", ...perm("settlements.manage"), h(async (req, res) => send(res, await updateSettlementStatus(req.user, req.params.settlementId, V.parse(V.settlementStatusSchema, req.body)), { message: "Settlement updated" })));

router.patch("/admin/payment-proofs/:proofId", ...perm("payments.manage"), h(async (req, res) => send(res, await reviewProof(req.user, req.params.proofId, V.parse(V.proofReviewSchema, req.body)), { message: "Proof reviewed" })));
router.post("/admin/maintenance/expire-stale-orders", ...perm("payments.manage"), h(async (req, res) => send(res, await expireStaleOrders(), { message: "Stale unpaid orders expired" })));

export default router;
