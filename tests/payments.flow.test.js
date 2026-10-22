import { describe, test, expect, beforeEach } from "bun:test";
import { setup, users, seedShop, seedProduct, fillCart, address, card, models } from "./helpers/seed.js";
import { checkout, markCodCollected, cancelOrder, expireStaleOrders } from "../src/modules/orders/order.service.js";
import { initiatePayfast, confirmPayfast, verifyPayment, handleThreeDsCallback, cancelPayment } from "../src/modules/orders/payment.service.js";
import { setActualGatewayFee, validateLedgerConsistency } from "../src/modules/orders/ledger.service.js";
import { env } from "../src/config/env.js";

const { Order, Payment, Allocation, Ledger, Product } = models;
let gw, U, shopA, shopB, pA, pB;
const IP = "203.0.113.9";

const placePayfast = async (lines = [[pA, 2]]) => {
  await fillCart(U.customer.id, lines);
  const { order } = await checkout(U.customer, { paymentMethod: "payfast", shippingAddress: address });
  return order;
};
const startPay = async (order, extra = {}) =>
  initiatePayfast(U.customer, IP, { orderId: order.id, accountType: "CARD", mobileNumber: "03451234567", instrument: card, ...extra });

beforeEach(async () => {
  gw = setup();
  U = users();
  shopA = await seedShop(U.sellerA.id, "Shop A");
  shopB = await seedShop(U.sellerB.id, "Shop B");
  pA = await seedProduct(shopA, 1000, { discount: 10 }); // 900.00 each
  pB = await seedProduct(shopB, 500);
  env.PAYFAST_ESTIMATED_FEE_BPS = 0;
});

describe("checkout", () => {
  test("prices come from the server, stock is reserved, cart cleared", async () => {
    const order = await placePayfast([[pA, 2], [pB, 1]]);
    expect(order.totalMinor).toBe(2 * 90000 + 50000);
    expect(order.paymentStatus).toBe("unpaid");
    const prod = await Product.findById(pA._id).lean();
    expect(prod.stock).toBe(48);
    expect((await models.Cart.findOne({ user: U.customer.id }).lean()).items).toHaveLength(0);
  });
  test("insufficient stock rolls back every reservation", async () => {
    await fillCart(U.customer.id, [[pB, 1], [pA, 1]]);
    await Product.updateOne({ _id: pA._id }, { $set: { stock: 0 } });
    await expect(checkout(U.customer, { paymentMethod: "cod", shippingAddress: address })).rejects.toMatchObject({ statusCode: 409 });
    expect((await Product.findById(pB._id).lean()).stock).toBe(50);
  });
  test("checkoutKey makes double submit idempotent", async () => {
    await fillCart(U.customer.id, [[pA, 1]]);
    const a = await checkout(U.customer, { paymentMethod: "cod", shippingAddress: address, checkoutKey: "key-12345678" });
    await fillCart(U.customer.id, [[pA, 1]]).catch(() => {});
    const b = await checkout(U.customer, { paymentMethod: "cod", shippingAddress: address, checkoutKey: "key-12345678" });
    expect(b.reused).toBe(true);
    expect(b.order.id).toBe(a.order.id);
    expect(await Order.countDocuments({})).toBe(1);
  });
  test("only customers can check out; disabled methods refused", async () => {
    await expect(checkout(U.sellerA, { paymentMethod: "cod", shippingAddress: address })).rejects.toMatchObject({ statusCode: 403 });
    env.COD_ENABLED = false;
    await fillCart(U.customer.id, [[pA, 1]]);
    await expect(checkout(U.customer, { paymentMethod: "cod", shippingAddress: address })).rejects.toMatchObject({ statusCode: 400 });
    env.COD_ENABLED = true;
  });
});

describe("COD", () => {
  test("placing a COD order never marks it paid; collection is explicit, staff-only and idempotent", async () => {
    await fillCart(U.customer.id, [[pA, 1], [pB, 2]]);
    const { order } = await checkout(U.customer, { paymentMethod: "cod", shippingAddress: address });
    expect(order.paymentStatus).toBe("cod_pending");
    expect(await Payment.countDocuments({})).toBe(0);
    expect(await Allocation.countDocuments({})).toBe(0);
    await expect(markCodCollected(U.customer, order.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(markCodCollected(U.adminNone, order.id)).rejects.toMatchObject({ statusCode: 403 });
    await markCodCollected(U.adminAll, order.id);
    await markCodCollected(U.adminAll, order.id);
    await Promise.all([markCodCollected(U.root, order.id), markCodCollected(U.root, order.id)]);
    const o = await Order.findById(order.id).lean();
    expect(o.paymentStatus).toBe("paid");
    expect(await Payment.countDocuments({})).toBe(1);
    expect(await Allocation.countDocuments({})).toBe(2);
    expect(await Ledger.countDocuments({ type: "charge" })).toBe(2);
    const a = await Allocation.findOne({ shopId: shopA._id }).lean();
    expect(a).toMatchObject({ grossMinor: 90000, sellerShareMinor: 54000, platformShareMinor: 36000, accountingState: "final", paymentMethod: "cod" });
  });
  test("cancelling a COD order releases stock once", async () => {
    await fillCart(U.customer.id, [[pA, 3]]);
    const { order } = await checkout(U.customer, { paymentMethod: "cod", shippingAddress: address });
    await cancelOrder(U.customer, order.id);
    await expect(cancelOrder(U.customer, order.id)).rejects.toMatchObject({ statusCode: 409 });
    expect((await Product.findById(pA._id).lean()).stock).toBe(50);
  });
});

describe("PayFast flow", () => {
  test("success: server amount sent, verified, order paid, ledger + provisional 60/40 allocation", async () => {
    const order = await placePayfast([[pA, 1], [pB, 1]]);
    const init = await startPay(order, { amountMinor: 1, amount: "1.00" }); // extra client fields are ignored by the service
    expect(init.amountMinor).toBe(140000);
    expect(JSON.stringify(init)).not.toContain("ITOK_SECRET");
    const tokenCall = gw.calls.find((c) => c.path === "/transaction/token");
    expect(tokenCall.form.txnamt).toBe("1400.00");
    expect(tokenCall.form.secured_hash).toHaveLength(64);
    expect(tokenCall.form.data_3ds_callback_url).toContain("/api/payments/payfast/3ds-callback?p=");
    const r = await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" });
    expect(r.payment.status).toBe("paid");
    const charge = gw.calls.find((c) => c.path === "/transaction/tokenized");
    expect(charge.form.txnamt).toBe("1400.00");
    expect(charge.form.instrument_token).toBe("ITOK_SECRET");
    const o = await Order.findById(order.id).lean();
    expect(o).toMatchObject({ paymentStatus: "paid", status: "confirmed" });
    const allocs = await Allocation.find({ orderId: order.id }).lean();
    expect(allocs).toHaveLength(2);
    for (const a of allocs) {
      expect(a.accountingState).toBe("provisional");
      expect(a.sellerShareMinor + a.platformShareMinor).toBe(a.distributableMinor);
      expect(validateLedgerConsistency(a)).toEqual([]);
    }
    const p = await Payment.findById(init.paymentId).lean();
    expect(p.secret).toBeUndefined();
    expect(p.amountVerification).toBe("request_only");
  });
  test("repeat verification / polling / confirm is idempotent (no duplicate ledger entries)", async () => {
    const order = await placePayfast();
    const init = await startPay(order);
    await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" });
    const n = await Ledger.countDocuments({});
    for (let i = 0; i < 3; i++) await verifyPayment(init.paymentId, IP);
    await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" });
    expect(await Ledger.countDocuments({})).toBe(n);
    expect(await Allocation.countDocuments({})).toBe(1);
    expect(gw.count("/transaction/tokenized")).toBe(1);
  });
  test("concurrent confirms submit exactly one charge", async () => {
    const order = await placePayfast();
    const init = await startPay(order);
    await Promise.all([1, 2, 3].map(() => confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" }).catch(() => null)));
    expect(gw.count("/transaction/tokenized")).toBe(1);
    expect(await Allocation.countDocuments({})).toBe(1);
    expect((await Payment.findById(init.paymentId).lean()).status).toBe("paid");
  });
  test("gateway reports failure -> failed payment, order stays payable, retry works with a new basket", async () => {
    const order = await placePayfast();
    gw.behavior.charge = "fail";
    const init = await startPay(order);
    const r = await confirmPayfast(U.customer, IP, init.paymentId, { otp: "000000" });
    expect(r.payment.status).toBe("failed");
    expect((await Order.findById(order.id).lean()).paymentStatus).toBe("failed");
    expect(await Allocation.countDocuments({})).toBe(0);
    gw.behavior.charge = "ok";
    const init2 = await startPay(order);
    expect(init2.basketId).not.toBe(init.basketId);
    expect((await confirmPayfast(U.customer, IP, init2.paymentId, { otp: "123456" })).payment.status).toBe("paid");
  });
  test("pending stays pending until the status API says otherwise", async () => {
    const order = await placePayfast();
    gw.behavior.charge = "pending";
    const init = await startPay(order);
    const r = await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" });
    expect(r.payment.status).toBe("pending");
    expect((await Order.findById(order.id).lean()).paymentStatus).toBe("pending");
    expect(await Allocation.countDocuments({})).toBe(0);
    gw.txns.get(init.basketId).status_code = "00"; // gateway completes later
    expect((await verifyPayment(init.paymentId, IP)).payment.status).toBe("paid");
  });
  test("timeout code -> timed_out", async () => {
    const order = await placePayfast();
    gw.behavior.charge = "timeout";
    const init = await startPay(order);
    expect((await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" })).payment.status).toBe("timed_out");
  });
  test("network error during charge: no retry of the charge, resolved later by status API", async () => {
    const order = await placePayfast();
    gw.behavior.charge = "network";
    const init = await startPay(order);
    const r = await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" });
    expect(r.finalized).toBe(false);
    await expect(startPay(order)).rejects.toMatchObject({ statusCode: 409 });
    expect(gw.count("/transaction/tokenized")).toBe(1);
  });
  test("tokenization rejected -> payment failed, 422", async () => {
    const order = await placePayfast();
    gw.behavior.tokenize = "reject";
    await expect(startPay(order)).rejects.toMatchObject({ statusCode: 422 });
    expect((await Payment.findOne({}).lean()).status).toBe("failed");
  });
  test("amount reported by gateway that differs -> invalid, never paid", async () => {
    const order = await placePayfast();
    const init = await startPay(order);
    gw.behavior.status = { txnamt: "1.00" };
    const r = await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" });
    expect(r.payment.status).toBe("invalid");
    expect((await Order.findById(order.id).lean()).paymentStatus).toBe("failed");
    expect(await Allocation.countDocuments({})).toBe(0);
  });
  test("matching gateway amount is recorded as verified by gateway response", async () => {
    const order = await placePayfast();
    const init = await startPay(order);
    gw.behavior.status = { txnamt: "1800.00" };
    await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" });
    expect((await Payment.findById(init.paymentId).lean()).amountVerification).toBe("gateway_response");
  });
  test("wrong basket id / transaction reference from gateway -> invalid", async () => {
    let order = await placePayfast();
    let init = await startPay(order);
    gw.behavior.status = { basket_id: "SOMEONE-ELSE" };
    expect((await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" })).payment.status).toBe("invalid");
    gw.reset();
    await Product.updateOne({ _id: pA._id }, { $set: { stock: 50 } });
    order = await placePayfast();
    init = await startPay(order);
    gw.behavior.status = { transaction_id: "FORGED" };
    expect((await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" })).payment.status).toBe("invalid");
  });
  test("a customer cannot pay or read someone else's order/payment", async () => {
    const order = await placePayfast();
    await expect(initiatePayfast(U.customer2, IP, { orderId: order.id, accountType: "CARD", mobileNumber: "03451234567", instrument: card })).rejects.toMatchObject({ statusCode: 404 });
    const init = await startPay(order);
    await expect(confirmPayfast(U.customer2, IP, init.paymentId, { otp: "123456" })).rejects.toMatchObject({ statusCode: 404 });
  });
  test("cancelled before charge; cannot cancel once charge submitted", async () => {
    const order = await placePayfast();
    const init = await startPay(order);
    expect((await cancelPayment(U.customer, init.paymentId)).status).toBe("cancelled");
    expect((await Order.findById(order.id).lean()).paymentStatus).toBe("unpaid");
    gw.behavior.charge = "network";
    const i2 = await startPay(order);
    await confirmPayfast(U.customer, IP, i2.paymentId, { otp: "123456" });
    await expect(cancelPayment(U.customer, i2.paymentId)).rejects.toMatchObject({ statusCode: 409 });
  });
  test("3DS callback needs the one-time token, stores PaRes and never marks paid", async () => {
    const order = await placePayfast();
    const init = await startPay(order);
    const url = new URL(gw.calls.find((c) => c.path === "/transaction/token").form.data_3ds_callback_url);
    const p = url.searchParams.get("p"), t = url.searchParams.get("t");
    await expect(handleThreeDsCallback({ paymentId: p, token: "wrong", params: { PaRes: "x" } })).rejects.toMatchObject({ statusCode: 400 });
    await expect(handleThreeDsCallback({ paymentId: p, token: null, params: {} })).rejects.toMatchObject({ statusCode: 400 });
    await handleThreeDsCallback({ paymentId: p, token: t, params: { PaRes: "PARES-DATA", MD: "" } });
    const stored = await Payment.findById(p).select("+secret").lean();
    expect(stored.secret.pares).toBe("PARES-DATA");
    expect(stored.status).toBe("pending");
    expect(stored.secret.callbackTokenHash).not.toContain(t);
    await confirmPayfast(U.customer, IP, init.paymentId, {});
    expect(gw.calls.find((c) => c.path === "/transaction/tokenized").form.data_3ds_pares).toBe("PARES-DATA");
  });
  test("unconfigured gateway is refused", async () => {
    const order = await placePayfast();
    env.PAYFAST_SECURED_KEY = "";
    try {
      await expect(startPay(order)).rejects.toMatchObject({ statusCode: 503 });
    } finally {
      env.PAYFAST_SECURED_KEY = "TEST_SECRET_KEY_do_not_use";
    }
  });
  test("secrets never reach any gateway-facing log or response (no PAN/CVV persisted)", async () => {
    const order = await placePayfast();
    const init = await startPay(order);
    await confirmPayfast(U.customer, IP, init.paymentId, { otp: "908172" });
    const dump = JSON.stringify([...Payment.__store, ...Order.__store, ...Ledger.__store]);
    expect(dump).not.toContain("4111111111111111");
    expect(dump).not.toContain("ITOK_SECRET");
    expect(dump).not.toContain("908172");
    expect(dump).not.toContain("\"cvv\"");
    expect((await Payment.findById(init.paymentId).lean()).instrumentLast4).toBe("1111");
  });
});

describe("gateway fee, provisional vs final accounting", () => {
  test("estimated fee is provisional; actual fee finalises with delta ledger entries, idempotently", async () => {
    env.PAYFAST_ESTIMATED_FEE_BPS = 200;
    const order = await placePayfast([[pA, 1], [pB, 1]]);
    const init = await startPay(order);
    await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" });
    let allocs = await Allocation.find({ orderId: order.id }).lean();
    expect(allocs.reduce((s, a) => s + a.gatewayFeeMinor, 0)).toBe(2800);
    expect(allocs.every((a) => a.accountingState === "provisional" && a.feeSource === "none" || a.feeSource === "estimated")).toBe(true);
    await expect(setActualGatewayFee({ paymentId: init.paymentId, feeMinor: 999999999, actor: U.root })).rejects.toMatchObject({ statusCode: 400 });
    await setActualGatewayFee({ paymentId: init.paymentId, feeMinor: 3500, reference: "stmt-1", actor: U.root });
    const n = await Ledger.countDocuments({});
    await setActualGatewayFee({ paymentId: init.paymentId, feeMinor: 3500, actor: U.root });
    expect(await Ledger.countDocuments({})).toBe(n);
    allocs = await Allocation.find({ orderId: order.id }).lean();
    expect(allocs.every((a) => a.accountingState === "final" && a.feeSource === "actual")).toBe(true);
    expect(allocs.reduce((s, a) => s + a.gatewayFeeMinor, 0)).toBe(3500);
    expect(allocs.reduce((s, a) => s + a.distributableMinor, 0)).toBe(140000 - 3500);
    // ledger net per shop equals allocation shares
    for (const a of allocs) {
      const rows = await Ledger.find({ shopId: a.shopId }).lean();
      const net = (acct) => rows.filter((r) => r.account === acct).reduce((s, r) => s + (r.direction === "credit" ? r.amountMinor : -r.amountMinor), 0);
      expect(net("seller")).toBe(a.sellerShareMinor);
      expect(net("platform")).toBe(a.platformShareMinor);
    }
  });
});

describe("stale orders", () => {
  test("unpaid PayFast orders past expiry are cancelled and stock released once", async () => {
    const order = await placePayfast([[pA, 4]]);
    await Order.updateOne({ _id: order.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await expireStaleOrders()).toEqual({ expired: 1 });
    expect(await expireStaleOrders()).toEqual({ expired: 0 });
    expect((await Product.findById(pA._id).lean()).stock).toBe(50);
    await expect(startPay(order)).rejects.toMatchObject({ statusCode: 409 });
  });
});
