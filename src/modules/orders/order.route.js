import { Router } from "express";
import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { h, send, sendPage } from "./http.js";
import { parse, checkoutSchema, refundRequestSchema } from "./order.validation.js";
import { checkout, getOrder, listOrders, cancelOrder } from "./order.service.js";
import { requestRefund } from "./refund.service.js";
import { uploadProof, listProofs, MAX_PROOF_BYTES, PROOF_MIME } from "./proof.service.js";
import { httpError } from "./access.js";

const router = Router();
router.use(authMiddleware);

const ANY_ROLE = ["customer", "seller", "admin", "super_admin"];
const customerOnly = checkRoleMiddleware("customer");

router.post("/checkout", customerOnly, h(async (req, res) => {
  const body = parse(checkoutSchema, req.body);
  const r = await checkout(req.user, body);
  send(res, r.order, { status: r.reused ? 200 : 201, message: r.reused ? "Existing order returned" : "Order created" });
}));

router.get("/", checkRoleMiddleware(ANY_ROLE), h(async (req, res) => sendPage(res, await listOrders(req.user, req.query), "Orders fetched")));
router.get("/:orderId", checkRoleMiddleware(ANY_ROLE), h(async (req, res) => send(res, await getOrder(req.user, req.params.orderId), { message: "Order fetched" })));
router.post("/:orderId/cancel", customerOnly, h(async (req, res) => send(res, await cancelOrder(req.user, req.params.orderId), { message: "Order cancelled" })));

router.post("/:orderId/refund-requests", customerOnly, h(async (req, res) => {
  const b = parse(refundRequestSchema, req.body);
  send(res, await requestRefund(req.user, req.params.orderId, { amountMinor: b.amount, reason: b.reason, shopId: b.shopId }), { status: 201, message: "Refund requested" });
}));

// Payment proof: raw binary body (Content-Type image/jpeg|png|webp), metadata in the query string.
// Using express.raw avoids adding a multipart dependency; the global JSON parser ignores image/* bodies.
const rawImage = express.raw({ type: PROOF_MIME, limit: MAX_PROOF_BYTES });
router.post("/:orderId/payment-proofs", customerOnly, (req, res, next) => rawImage(req, res, (err) => {
  if (err) return next(err.type === "entity.too.large" ? httpError("File is too large (max 3 MB)", 413) : httpError("Invalid upload", 400));
  next();
}), h(async (req, res) => {
  if (!Buffer.isBuffer(req.body)) throw httpError("Send the image as the raw request body with Content-Type image/jpeg, image/png or image/webp", 415);
  const q = req.query;
  send(res, await uploadProof(req.user, req.params.orderId, {
    buffer: req.body, declaredMime: String(req.headers["content-type"] || "").split(";")[0].trim(),
    filename: q.filename, amount: q.amount, reference: q.reference, paymentDate: q.paymentDate,
  }), { status: 201, message: "Payment proof uploaded" });
}));
router.get("/:orderId/payment-proofs", checkRoleMiddleware(["customer", "admin", "super_admin"]), h(async (req, res) => sendPage(res, await listProofs(req.user, req.params.orderId, req.query), "Payment proofs fetched")));

export default router;
