import crypto from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { h, send } from "./http.js";
import { parse, initiateSchema, confirmSchema } from "./order.validation.js";
import { paymentMethodsAvailable } from "./order.service.js";
import { initiatePayfast, confirmPayfast, verifyPayment, cancelPayment, getPaymentForUser, handleThreeDsCallback } from "./payment.service.js";
import { openProofFile } from "./proof.service.js";
import { clientIp } from "./payfast.client.js";

const router = Router();
const customerOnly = checkRoleMiddleware("customer");
const ANY_ROLE = ["customer", "seller", "admin", "super_admin"];

// limits card-testing / OTP guessing; keyed by user id when authenticated
const payLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "development" ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => res.status(429).json({ success: false, message: "Too many payment attempts. Please try again later." }),
});

router.get("/methods", (req, res) => send(res, paymentMethodsAvailable(), { message: "Payment methods" }));

// ---- 3-D Secure return (TermUrl). Public; protected by a per-payment one-time token. Never marks paid. ----
const clientOrigin = () => new URL(env.CLIENT_URL).origin;
router.all("/payfast/3ds-callback", h(async (req, res) => {
  const params = { ...(req.query || {}), ...(req.body && typeof req.body === "object" ? req.body : {}) };
  const r = await handleThreeDsCallback({ paymentId: req.query.p, token: req.query.t, params });
  const origin = clientOrigin();
  const resultUrl = `${origin}/checkout/payment-result?orderId=${r.orderId}&paymentId=${r.paymentId}`;
  const script = `(function(){var r=${JSON.stringify(resultUrl)};try{if(window.parent&&window.parent!==window){window.parent.postMessage({type:"payfast-3ds-complete",paymentId:${JSON.stringify(r.paymentId)}},${JSON.stringify(origin)});}else{window.location.replace(r);}}catch(e){window.location.replace(r);}})();`;
  const hash = crypto.createHash("sha256").update(script).digest("base64");
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", `default-src 'none'; script-src 'sha256-${hash}'; frame-ancestors ${origin}; base-uri 'none'; form-action 'none'`);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).type("html").send(`<!doctype html><html><head><meta charset="utf-8"><title>Payment</title></head><body><p>Returning to the store&hellip;</p><script>${script}</script><noscript><a href="${resultUrl}">Continue</a></noscript></body></html>`);
}));

router.post("/payfast/initiate", authMiddleware, customerOnly, payLimiter, h(async (req, res) => {
  const b = parse(initiateSchema, req.body);
  send(res, await initiatePayfast(req.user, clientIp(req), b), { status: 201, message: "Payment initiated" });
}));
router.post("/payfast/:paymentId/confirm", authMiddleware, customerOnly, payLimiter, h(async (req, res) => {
  const b = parse(confirmSchema, req.body);
  send(res, await confirmPayfast(req.user, clientIp(req), req.params.paymentId, b), { message: "Payment processed" });
}));
router.get("/payfast/:paymentId/status", authMiddleware, checkRoleMiddleware(ANY_ROLE), h(async (req, res) => {
  const p = await getPaymentForUser(req.user, req.params.paymentId); // ownership / permission check
  send(res, await verifyPayment(p._id, clientIp(req)), { message: "Payment status" });
}));
router.post("/payfast/:paymentId/cancel", authMiddleware, customerOnly, h(async (req, res) => send(res, await cancelPayment(req.user, req.params.paymentId), { message: "Payment cancelled" })));

// private proof download: owner or authorised staff only; never cached, never inline-sniffed
router.get("/proofs/:proofId/file", authMiddleware, checkRoleMiddleware(["customer", "admin", "super_admin"]), h(async (req, res, next) => {
  const { proof, stream } = await openProofFile(req.user, req.params.proofId);
  res.setHeader("Content-Type", proof.mimeType);
  res.setHeader("Content-Length", String(proof.sizeBytes));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `inline; filename="${proof.originalName.replace(/"/g, "")}"`);
  stream.on("error", next);
  stream.pipe(res);
}));

export default router;
