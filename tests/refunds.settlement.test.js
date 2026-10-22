import { describe, test, expect, beforeEach } from "bun:test";
import { setup, users, seedShop, seedProduct, fillCart, address, card, models } from "./helpers/seed.js";
import { checkout, markCodCollected } from "../src/modules/orders/order.service.js";
import { initiatePayfast, confirmPayfast } from "../src/modules/orders/payment.service.js";
import { createRefund, requestRefund, processRefund, rejectRefund, reconcileRefund } from "../src/modules/orders/refund.service.js";
import { setActualGatewayFee } from "../src/modules/orders/ledger.service.js";
import { createSettlement, updateSettlementStatus } from "../src/modules/orders/settlement.service.js";
import { shopSummary } from "../src/modules/orders/finance.service.js";

const { Order, Payment, Allocation, Ledger, Refund } = models;
let gw, U, shopA, shopB, pA, pB;
const IP = "203.0.113.9";

const paidOrder = async (lines, { fee = null } = {}) => {
  await fillCart(U.customer.id, lines);
  const { order } = await checkout(U.customer, { paymentMethod: "payfast", shippingAddress: address });
  const init = await initiatePayfast(U.customer, IP, { orderId: order.id, accountType: "CARD", mobileNumber: "03451234567", instrument: card });
  await confirmPayfast(U.customer, IP, init.paymentId, { otp: "123456" });
  if (fee !== null) await setActualGatewayFee({ paymentId: init.paymentId, feeMinor: fee, actor: U.root });
  return { order, paymentId: init.paymentId };
};
const net = (rows, account) => rows.filter((r) => r.account === account).reduce((s, r) => s + (r.direction === "credit" ? r.amountMinor : -r.amountMinor), 0);

beforeEach(async () => {
  gw = setup();
  U = users();
  shopA = await seedShop(U.sellerA.id, "Shop A");
  shopB = await seedShop(U.sellerB.id, "Shop B");
  pA = await seedProduct(shopA, 1000);
  pB = await seedProduct(shopB, 500);
});

describe("refunds", () => {
  test("partial then full refund: limits, ledger reversal and order/payment state", async () => {
    const { order, paymentId } = await paidOrder([[pA, 1]], { fee: 3000 }); // 1000.00, fee 30.00
    const r1 = await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 25000, reason: "damaged item" });
    expect(r1.outcome).toBe("processed");
    expect(gw.calls.find((c) => c.path.startsWith("/transaction/refund/")).form).toMatchObject({ txnamt: "250.00", refund_reason: "damaged item" });
    expect((await Payment.findById(paymentId).lean()).status).toBe("partially_refunded");
    expect((await Order.findById(order.id).lean())).toMatchObject({ paymentStatus: "partially_refunded", refundedMinor: 25000 });
    await expect(createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 75001, reason: "too much" })).rejects.toMatchObject({ statusCode: 400 });
    const r2 = await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 75000, reason: "rest of it" });
    expect(r2.outcome).toBe("processed");
    const p = await Payment.findById(paymentId).lean();
    expect(p).toMatchObject({ status: "refunded", refundedMinor: 100000, refundReservedMinor: 0 });
    expect((await Order.findById(order.id).lean())).toMatchObject({ paymentStatus: "refunded", status: "refunded" });
    const a = await Allocation.findOne({ orderId: order.id }).lean();
    expect(a).toMatchObject({ refundedGrossMinor: 100000, refundReservedMinor: 0, sellerRefundedMinor: a.sellerShareMinor, platformRefundedMinor: a.platformShareMinor });
    const rows = await Ledger.find({ shopId: shopA._id }).lean();
    expect(net(rows, "seller")).toBe(0);
    expect(net(rows, "platform")).toBe(0);
    await expect(createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 1, reason: "again" })).rejects.toMatchObject({ statusCode: 409 });
  });
  test("authorization: customer, seller and admin without permission cannot refund", async () => {
    const { order } = await paidOrder([[pA, 1]]);
    for (const u of [U.customer, U.sellerA, U.adminNone]) await expect(createRefund(u, IP, { orderId: order.id, amountMinor: 100, reason: "nope" })).rejects.toMatchObject({ statusCode: 403 });
    expect(gw.count("/transaction/refund/" + "x")).toBe(0);
    expect(await Refund.countDocuments({})).toBe(0);
  });
  test("requestId makes retries idempotent (one gateway refund)", async () => {
    const { order } = await paidOrder([[pA, 1]]);
    const a = await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 10000, reason: "dup test", requestId: "req-12345678" });
    const b = await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 10000, reason: "dup test", requestId: "req-12345678" });
    expect(b.replay).toBe(true);
    expect(b.refund.id).toBe(a.refund.id);
    expect(gw.calls.filter((c) => c.path.startsWith("/transaction/refund/"))).toHaveLength(1);
    expect((await Payment.findOne({}).lean()).refundedMinor).toBe(10000);
  });
  test("concurrent refunds can never exceed the paid amount", async () => {
    const { order } = await paidOrder([[pA, 1]]);
    const res = await Promise.allSettled([1, 2, 3].map((i) => createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 60000, reason: "race " + i })));
    expect(res.filter((r) => r.status === "fulfilled" && r.value.outcome === "processed")).toHaveLength(1);
    const p = await Payment.findOne({}).lean();
    expect(p.refundedMinor).toBe(60000);
    expect(p.refundReservedMinor).toBe(0);
  });
  test("gateway rejection: refund failed, reservation released, can retry", async () => {
    const { order } = await paidOrder([[pA, 1]]);
    gw.behavior.refund = "reject";
    const r = await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 50000, reason: "try 1" });
    expect(r.outcome).toBe("failed");
    expect(r.refund.status).toBe("failed");
    const p = await Payment.findOne({}).lean();
    expect(p).toMatchObject({ refundedMinor: 0, refundReservedMinor: 0, status: "paid" });
    gw.behavior.refund = "ok";
    expect((await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 50000, reason: "try 2" })).outcome).toBe("processed");
  });
  test("unknown gateway outcome keeps funds reserved until an admin reconciles; no auto double refund", async () => {
    const { order } = await paidOrder([[pA, 1]]);
    gw.behavior.refund = "network";
    const r = await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 100000, reason: "timeout case" });
    expect(r.outcome).toBe("unknown");
    expect(r.refund.needsReconciliation).toBe(true);
    await expect(createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 1, reason: "second" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(reconcileRefund(U.adminAll, r.refund.id, { outcome: "processed" })).rejects.toMatchObject({ statusCode: 400 });
    const done = await reconcileRefund(U.adminAll, r.refund.id, { outcome: "processed", gatewayReference: "PORTAL-REF-1" });
    expect(done.refund.status).toBe("processed");
    expect((await Payment.findOne({}).lean())).toMatchObject({ status: "refunded", refundReservedMinor: 0 });
    await expect(reconcileRefund(U.adminAll, r.refund.id, { outcome: "failed" })).rejects.toMatchObject({ statusCode: 409 });
  });
  test("5xx from gateway is treated as unknown, not as failure", async () => {
    const { order } = await paidOrder([[pA, 1]]);
    gw.behavior.refund = "5xx";
    expect((await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 1000, reason: "gateway 502" })).outcome).toBe("unknown");
  });
  test("multi-shop order: pro-rata split, per-shop limit, shop-targeted refund", async () => {
    const { order } = await paidOrder([[pA, 1], [pB, 1]], { fee: 1500 });
    await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 30000, reason: "split refund" });
    const allocs = await Allocation.find({ orderId: order.id }).lean();
    expect(allocs.reduce((s, a) => s + a.refundedGrossMinor, 0)).toBe(30000);
    const a = allocs.find((x) => String(x.shopId) === String(shopB._id));
    await expect(createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: a.grossMinor, reason: "too big", shopId: String(shopB._id) })).rejects.toMatchObject({ statusCode: 400 });
    await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 1000, reason: "just B", shopId: String(shopB._id) });
    const b2 = await Allocation.findOne({ shopId: shopB._id }).lean();
    expect(b2.refundedGrossMinor).toBe(a.refundedGrossMinor + 1000);
    for (const al of await Allocation.find({}).lean()) {
      expect(al.sellerRefundedMinor).toBeLessThanOrEqual(al.sellerShareMinor);
      expect(al.platformRefundedMinor).toBeLessThanOrEqual(al.platformShareMinor);
    }
  });
  test("customer request -> staff process / reject", async () => {
    const { order } = await paidOrder([[pA, 1]]);
    await expect(requestRefund(U.customer2, order.id, { amountMinor: 100, reason: "not mine" })).rejects.toMatchObject({ statusCode: 404 });
    const req = await requestRefund(U.customer, order.id, { amountMinor: 20000, reason: "changed my mind" });
    expect(req.status).toBe("requested");
    await expect(requestRefund(U.customer, order.id, { amountMinor: 100, reason: "second open" })).rejects.toMatchObject({ statusCode: 409 });
    expect(gw.calls.filter((c) => c.path.startsWith("/transaction/refund/"))).toHaveLength(0);
    await expect(processRefund(U.adminNone, IP, req.id)).rejects.toMatchObject({ statusCode: 403 });
    expect((await processRefund(U.adminAll, IP, req.id)).outcome).toBe("processed");
    await expect(processRefund(U.adminAll, IP, req.id)).rejects.toMatchObject({ statusCode: 409 });
    const r2 = await requestRefund(U.customer, order.id, { amountMinor: 100, reason: "another" });
    expect((await rejectRefund(U.adminAll, r2.id, "no")).status).toBe("rejected");
  });
  test("COD refunds are manual, need a reference, and are labelled as such", async () => {
    await fillCart(U.customer.id, [[pA, 1]]);
    const { order } = await checkout(U.customer, { paymentMethod: "cod", shippingAddress: address });
    await expect(createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 100, reason: "before payment" })).rejects.toMatchObject({ statusCode: 409 });
    await markCodCollected(U.adminAll, order.id);
    await expect(createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 5000, reason: "cod refund" })).rejects.toMatchObject({ statusCode: 400 });
    const r = await createRefund(U.adminAll, IP, { orderId: order.id, amountMinor: 5000, reason: "cod refund", manualReference: "BANK-TRF-77" });
    expect(r.refund).toMatchObject({ method: "manual", status: "processed" });
    expect(gw.calls.filter((c) => c.path.startsWith("/transaction/refund/"))).toHaveLength(0);
  });
});

describe("settlement tracking (never a real payout)", () => {
  test("only finalised online allocations are settled; amounts follow refunds; paid needs reference; idempotent ledger", async () => {
    const o1 = await paidOrder([[pA, 1]]); // provisional
    await expect(createSettlement(U.adminAll, { shopId: String(shopA._id) })).rejects.toMatchObject({ statusCode: 409 });
    await setActualGatewayFee({ paymentId: o1.paymentId, feeMinor: 2000, actor: U.root });
    const o2 = await paidOrder([[pA, 1]], { fee: 0 });
    await createRefund(U.adminAll, IP, { orderId: o2.order.id, amountMinor: 50000, reason: "half" });
    const s = await createSettlement(U.adminAll, { shopId: String(shopA._id) });
    const alloc1 = await Allocation.findOne({ orderId: o1.order.id }).lean();
    const alloc2 = await Allocation.findOne({ orderId: o2.order.id }).lean();
    expect(s.netMinor).toBe(alloc1.sellerShareMinor + (alloc2.sellerShareMinor - alloc2.sellerRefundedMinor));
    await expect(createSettlement(U.adminAll, { shopId: String(shopA._id) })).rejects.toMatchObject({ statusCode: 409 });
    await expect(createSettlement(U.adminNone, { shopId: String(shopA._id) })).rejects.toMatchObject({ statusCode: 403 });
    await expect(updateSettlementStatus(U.adminAll, s.id, { status: "paid" })).rejects.toMatchObject({ statusCode: 400 });
    const paid = await updateSettlementStatus(U.adminAll, s.id, { status: "paid", reference: "IBFT-998877" });
    expect(paid.status).toBe("paid");
    await expect(updateSettlementStatus(U.adminAll, s.id, { status: "paid", reference: "IBFT-998877" })).rejects.toMatchObject({ statusCode: 409 });
    expect(await Ledger.countDocuments({ type: "settlement" })).toBe(2);
    expect((await Allocation.findOne({ orderId: o1.order.id }).lean()).settlementStatus).toBe("settled");
    const sum = await shopSummary(shopA._id);
    expect(sum.online.sellerSettledMinor).toBe(s.netMinor);
    expect(gw.calls.every((c) => !c.path.includes("payout") && !c.path.includes("settle"))).toBe(true);
  });
  test("fee cannot be changed after refund or settlement", async () => {
    const o = await paidOrder([[pA, 1]], { fee: 100 });
    await createRefund(U.adminAll, IP, { orderId: o.order.id, amountMinor: 100, reason: "tiny" });
    await expect(setActualGatewayFee({ paymentId: o.paymentId, feeMinor: 200, actor: U.root })).rejects.toMatchObject({ statusCode: 409 });
  });
  test("platform-owned shop: 100% PakBazaar, never settled to a seller", async () => {
    const own = await seedShop(null, "PakBazaar Store", "pakbazaar");
    const p = await seedProduct(own, 400);
    await paidOrder([[p, 1]], { fee: 0 });
    const a = await Allocation.findOne({ shopId: own._id }).lean();
    expect(a).toMatchObject({ sellerShareMinor: 0, platformShareMinor: 40000, sellerBps: 0 });
    await expect(createSettlement(U.root, { shopId: String(own._id) })).rejects.toMatchObject({ statusCode: 404 });
  });
});
