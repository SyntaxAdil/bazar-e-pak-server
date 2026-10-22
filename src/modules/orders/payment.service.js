import crypto from "node:crypto";
import Payment from "./payment.model.js";
import Order from "./order.model.js";
import { env } from "../../config/env.js";
import * as pf from "./payfast.client.js";
import { ensureFinancials, estimatedFeeMinor } from "./ledger.service.js";
import { formatMinor, pktDate, minorToPkr } from "./money.js";
import { httpError, assertObjectId, assertStaffPermission, isStaff } from "./access.js";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const safeMsg = (m) => (typeof m === "string" ? m.replace(/[\r\n]+/g, " ").slice(0, 200) : null);
const STALE_UNKNOWN_MS = 30 * 60 * 1000;
export const TERMINAL = ["paid", "failed", "cancelled", "timed_out", "invalid", "refunded", "partially_refunded"];

export const serializePayment = (p, { staff = false } = {}) => ({
  id: String(p._id),
  orderId: String(p.orderId),
  provider: p.provider,
  method: p.method,
  status: p.status,
  stage: p.stage,
  instrumentType: p.instrumentType,
  amountMinor: p.amountMinor,
  currency: p.currency,
  basketId: p.basketId,
  failureMessage: p.failureMessage,
  paidAt: p.paidAt,
  refundedMinor: p.refundedMinor,
  createdAt: p.createdAt,
  ...(staff
    ? {
        customerId: p.customerId,
        providerReference: p.providerReference,
        gatewayStatusCode: p.gatewayStatusCode,
        gatewayStatusMessage: p.gatewayStatusMessage,
        failureCode: p.failureCode,
        amountVerification: p.amountVerification,
        verifiedAt: p.verifiedAt,
        gatewayFeeMinor: p.gatewayFeeMinor,
        feeSource: p.feeSource,
        refundReservedMinor: p.refundReservedMinor,
        flags: p.metadata?.flags || [],
      }
    : {}),
});

const syncOrder = async (payment, status) => {
  if (status === "paid") {
    const o = await Order.findOneAndUpdate(
      { _id: payment.orderId, status: { $in: ["pending", "confirmed"] }, paymentStatus: { $in: ["pending", "unpaid", "failed", "cancelled"] } },
      { $set: { paymentStatus: "paid", status: "confirmed", paymentId: payment._id, expiresAt: null } },
      { new: true },
    ).lean();
    if (!o) {
      const cur = await Order.findById(payment.orderId).lean();
      if (cur && cur.status === "cancelled")
        await Payment.updateOne({ _id: payment._id }, { $set: { "metadata.flags": ["PAID_AFTER_ORDER_CANCELLED"] } });
    }
    return;
  }
  const next = status === "cancelled" ? "unpaid" : "failed";
  await Order.findOneAndUpdate({ _id: payment.orderId, paymentStatus: "pending", paymentId: payment._id }, { $set: { paymentStatus: next } });
};

const terminate = async (payment, status, { code = null, message = null } = {}) => {
  const p = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "pending" },
    { $set: { status, failureCode: code, failureMessage: safeMsg(message), ...(code ? { gatewayStatusCode: code } : {}), "secret.instrumentToken": null, "secret.pares": null } },
    { new: true },
  ).lean();
  if (p) await syncOrder(p, status);
  return p || (await Payment.findById(payment._id).lean());
};

export const initiatePayfast = async (user, ip, { orderId, accountType, mobileNumber, instrument }) => {
  if (user.role !== "customer") throw httpError("Only customers can pay for orders", 403);
  if (!pf.isConfigured()) throw httpError("PayFast is not available", 503);
  if (!pf.enabledAccountTypes().includes(accountType)) throw httpError(`Payment type ${accountType} is not enabled`, 400);
  assertObjectId(orderId, "order ID");
  const order = await Order.findOne({ _id: orderId, customerId: user.id }).lean();
  if (!order) throw httpError("Order not found", 404);
  if (order.paymentMethod !== "payfast") throw httpError("This order is not a PayFast order", 409);
  if (order.status !== "pending" || !["unpaid", "failed"].includes(order.paymentStatus)) throw httpError("Order is not awaiting payment", 409);
  if (order.expiresAt && new Date(order.expiresAt) < new Date()) throw httpError("Order payment window has expired", 409);

  const open = await Payment.findOne({ orderId: order._id, status: "pending" }).lean();
  if (open) {
    if (open.stage === "charge_submitted") throw httpError("A payment for this order is already being processed", 409);
    await terminate(open, "cancelled", { message: "Superseded by a new attempt" });
  }

  const basketId = `PB${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const callbackToken = crypto.randomBytes(24).toString("hex");
  const last4 = accountType === "CARD" ? String(instrument?.card_number || "").replace(/\D/g, "").slice(-4) || null : null;
  const payment = await Payment.create({
    orderId: order._id,
    customerId: user.id,
    provider: "payfast",
    method: accountType.toLowerCase(),
    status: "pending",
    stage: "created",
    amount: minorToPkr(order.totalMinor),
    amountMinor: order.totalMinor, // trusted server-side amount; never from the client
    basketId,
    instrumentType: accountType,
    instrumentLast4: last4,
    secret: { callbackTokenHash: sha256(callbackToken) },
  });
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $in: ["unpaid", "failed"] } },
    { $set: { paymentStatus: "pending", paymentId: payment._id } },
  );
  if (!claimed) {
    await terminate(payment, "cancelled", { message: "Order state changed" });
    throw httpError("Order is not awaiting payment", 409);
  }

  let r;
  try {
    r = await pf.createTransactionToken({
      ip,
      merchantUserId: user.id,
      mobile: mobileNumber,
      accountType,
      instrument,
      basketId,
      orderDate: pktDate(),
      amount: formatMinor(order.totalMinor),
      callbackUrl: `${env.SERVER_URL.replace(/\/+$/, "")}/api/payments/payfast/3ds-callback?p=${payment._id}&t=${callbackToken}`,
    });
  } catch (e) {
    await terminate(payment, "failed", { message: "Could not reach the payment gateway" });
    throw httpError("Payment gateway is unavailable, please try again", e.statusCode === 503 ? 503 : 502);
  }
  if (!r.ok || !r.raw.instrument_token || !r.transactionId) {
    await terminate(payment, "failed", { code: r.code, message: r.message || "Payment could not be started" });
    throw httpError(safeMsg(r.message) || "Payment could not be started", 422);
  }
  await Payment.updateOne(
    { _id: payment._id, status: "pending", stage: "created" },
    {
      $set: {
        stage: "tokenized",
        providerReference: r.transactionId,
        gatewayStatusCode: r.code,
        gatewayStatusMessage: safeMsg(r.message),
        "secret.instrumentToken": r.raw.instrument_token,
        "secret.data3dsSecureId": r.raw.data_3ds_secureid || null,
        "secret.eci": r.raw.eci === undefined || r.raw.eci === null ? null : String(r.raw.eci),
        "metadata.mobile": mobileNumber,
      },
    },
  );
  return {
    paymentId: String(payment._id),
    orderId: String(order._id),
    basketId,
    amountMinor: order.totalMinor,
    currency: "PKR",
    stage: "tokenized",
    otpRequired: r.raw.otp_required === true || r.raw.otp_required === "true",
    threeDS: {
      required: Boolean(r.raw.data_3ds_html || r.raw.data_3ds_acsurl),
      html: r.raw.data_3ds_html || null,
      acsUrl: r.raw.data_3ds_acsurl || null,
      isNon3DsCard: r.raw.isNon3DsCard === true,
    },
    message: safeMsg(r.message),
  };
};

export const confirmPayfast = async (user, ip, paymentId, { otp } = {}) => {
  assertObjectId(paymentId, "payment ID");
  const payment = await Payment.findOne({ _id: paymentId, customerId: user.id, provider: "payfast" }).select("+secret").lean();
  if (!payment) throw httpError("Payment not found", 404);
  if (payment.status !== "pending") return { payment: serializePayment(payment), finalized: true };
  if (payment.stage === "charge_submitted") return verifyPayment(paymentId, ip, { reason: "confirm-repeat" });
  if (payment.stage !== "tokenized") throw httpError("Payment has not been initiated", 409);
  const order = await Order.findById(payment.orderId).lean();
  if (!order || order.status !== "pending") throw httpError("Order is not awaiting payment", 409);
  const s = payment.secret || {};
  if (s.data3dsSecureId && !s.pares && !otp) throw httpError("3-D Secure verification has not completed", 409);

  // single submission guard: only one request may move tokenized -> charge_submitted
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "pending", stage: "tokenized" },
    { $set: { stage: "charge_submitted", "secret.instrumentToken": null } },
    { new: true },
  ).lean();
  if (!claimed) return verifyPayment(paymentId, ip, { reason: "confirm-race" });

  let r = null;
  try {
    r = await pf.chargeTokenized({
      ip,
      instrumentToken: s.instrumentToken,
      merchantUserId: user.id,
      mobile: payment.metadata?.mobile,
      basketId: payment.basketId,
      orderDate: pktDate(),
      description: `Order ${order.orderNumber}`,
      amount: formatMinor(payment.amountMinor), // server-side amount
      otp,
      transactionId: payment.providerReference,
      eci: s.eci,
      secureId: s.data3dsSecureId,
      pares: s.pares,
    });
  } catch {
    // outcome unknown (timeout): never retry the charge; the status API decides
    return { payment: serializePayment(claimed), finalized: false, message: "Payment is being verified" };
  }
  await Payment.updateOne(
    { _id: payment._id },
    {
      $set: {
        gatewayStatusCode: r.code,
        gatewayStatusMessage: safeMsg(r.message),
        ...(r.transactionId ? { providerReference: r.transactionId } : {}),
        "secret.pares": null,
      },
    },
  );
  return verifyPayment(paymentId, ip, { reason: "confirm" });
};

// Authoritative verification against the gateway status API. Idempotent and race-safe.
export const verifyPayment = async (paymentId, ip, { allowRecover = false } = {}) => {
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) throw httpError("Payment not found", 404);
  if (payment.provider !== "payfast") return { payment: serializePayment(payment), finalized: true };
  const recoverable = allowRecover && ["failed", "timed_out", "invalid"].includes(payment.status);
  if (["paid", "partially_refunded", "refunded"].includes(payment.status)) {
    await syncOrder(payment, "paid");
    await ensureFinancials(payment._id);
    return { payment: serializePayment(payment), finalized: true };
  }
  if (payment.status !== "pending" && !recoverable) return { payment: serializePayment(payment), finalized: true };
  if (payment.stage !== "charge_submitted" && !recoverable)
    return { payment: serializePayment(payment), finalized: false, message: "Waiting for customer to complete payment" };

  let r;
  try {
    r = await pf.fetchTransactionStatus({ ip, basketId: payment.basketId });
  } catch {
    return { payment: serializePayment(payment), finalized: false, message: "Gateway unreachable, will retry" };
  }
  if (!r.ok) {
    if (r.httpStatus === 404 && Date.now() - new Date(payment.updatedAt).getTime() > STALE_UNKNOWN_MS && payment.status === "pending") {
      const p = await terminate(payment, "timed_out", { message: "No transaction found at gateway" });
      return { payment: serializePayment(p), finalized: true };
    }
    return { payment: serializePayment(payment), finalized: false, message: "Status not available yet" };
  }
  if (r.basketId && r.basketId !== payment.basketId) {
    const p = await markInvalid(payment, "basket_id mismatch");
    return { payment: serializePayment(p), finalized: true };
  }
  const cls = pf.classifyCode(r.code);
  if (cls === "paid") {
    if (r.amountMinor !== null && (Number.isNaN(r.amountMinor) || r.amountMinor !== payment.amountMinor)) {
      const p = await markInvalid(payment, "amount mismatch");
      return { payment: serializePayment(p), finalized: true };
    }
    if (r.transactionId && payment.providerReference && r.transactionId !== payment.providerReference) {
      const p = await markInvalid(payment, "transaction reference mismatch");
      return { payment: serializePayment(p), finalized: true };
    }
    const p = await finalizePaid(payment, r, recoverable);
    return { payment: serializePayment(p), finalized: true };
  }
  if (cls === "pending") {
    await Payment.updateOne({ _id: payment._id }, { $set: { gatewayStatusCode: r.code, gatewayStatusMessage: safeMsg(r.message) } });
    return { payment: serializePayment({ ...payment, gatewayStatusCode: r.code }), finalized: false, message: "Payment pending" };
  }
  if (recoverable) return { payment: serializePayment(payment), finalized: true };
  const p = await terminate(payment, cls, { code: r.code, message: r.message });
  return { payment: serializePayment(p), finalized: true };
};

const markInvalid = async (payment, why) => {
  const p = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: ["pending", "failed", "timed_out"] } },
    { $set: { status: "invalid", failureMessage: why, "metadata.flags": ["VERIFICATION_MISMATCH"], "secret.instrumentToken": null } },
    { new: true },
  ).lean();
  if (p) await syncOrder(p, "failed");
  return p || (await Payment.findById(payment._id).lean());
};

const finalizePaid = async (payment, r, recoverable) => {
  const fee = estimatedFeeMinor(payment.amountMinor);
  const won = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: ["pending", "authorized", ...(recoverable ? ["failed", "timed_out", "invalid"] : [])] } },
    {
      $set: {
        status: "paid",
        stage: "verified",
        paidAt: new Date(),
        verifiedAt: new Date(),
        gatewayStatusCode: r.code,
        gatewayStatusMessage: safeMsg(r.message),
        failureCode: null,
        failureMessage: null,
        providerReference: r.transactionId || payment.providerReference,
        amountVerification: r.amountMinor === null ? "request_only" : "gateway_response",
        gatewayFeeMinor: fee,
        feeSource: env.PAYFAST_ESTIMATED_FEE_BPS > 0 ? "estimated" : "none",
        "secret.instrumentToken": null,
        "secret.pares": null,
      },
    },
    { new: true },
  ).lean();
  const p = won || (await Payment.findById(payment._id).lean());
  await syncOrder(p, "paid");
  await ensureFinancials(p._id); // idempotent; also repairs a crash between status change and ledger write
  return p;
};

export const getPaymentForUser = async (user, paymentId) => {
  assertObjectId(paymentId, "payment ID");
  const p = await Payment.findById(paymentId).lean();
  if (!p) throw httpError("Payment not found", 404);
  if (isStaff(user)) {
    assertStaffPermission(user, "payments.view");
  } else if (p.customerId !== user.id) throw httpError("Payment not found", 404);
  return p;
};

export const cancelPayment = async (user, paymentId) => {
  const p = await getPaymentForUser(user, paymentId);
  if (p.customerId !== user.id) throw httpError("Payment not found", 404);
  if (p.status !== "pending") return serializePayment(p);
  if (p.stage === "charge_submitted") throw httpError("Payment is already being processed", 409);
  const t = await terminate(p, "cancelled", { message: "Cancelled by customer" });
  return serializePayment(t);
};

// 3-D Secure return (TermUrl). Public by nature, so it is protected by a per-payment one-time token
// and it NEVER marks anything paid: it only stores PaRes; the status API decides the outcome.
export const handleThreeDsCallback = async ({ paymentId, token, params }) => {
  if (!paymentId || !token || !/^[0-9a-f]{24}$/i.test(String(paymentId))) throw httpError("Invalid callback", 400);
  const p = await Payment.findById(paymentId).select("+secret").lean();
  const expected = p?.secret?.callbackTokenHash;
  const given = sha256(String(token));
  if (!p || !expected || expected.length !== given.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given)))
    throw httpError("Invalid callback", 400);
  if (p.status === "pending" && p.stage === "tokenized") {
    const lower = Object.fromEntries(Object.entries(params || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const pares = lower.pares || lower.data_3ds_pares;
    if (typeof pares === "string" && pares.length > 0 && pares.length < 20000)
      await Payment.updateOne({ _id: p._id, status: "pending", stage: "tokenized" }, { $set: { "secret.pares": pares } });
  }
  return { paymentId: String(p._id), orderId: String(p.orderId) };
};
