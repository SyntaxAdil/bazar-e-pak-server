import { describe, test, expect, beforeAll, beforeEach, afterAll, mock } from "bun:test";

// Stub only the JWT/JWKS authentication; role + permission middleware and all routes are the real ones.
mock.module("../src/middlewares/auth.middleware.js", () => ({
  default: (req, res, next) => {
    const raw = req.headers["x-test-user"];
    if (!raw) return next(Object.assign(new Error("Unauthorized - No token provided"), { statusCode: 401 }));
    req.user = JSON.parse(raw);
    next();
  },
}));

const express = (await import("express")).default;
const { default: orderRoutes } = await import("../src/modules/orders/order.route.js");
const { default: paymentRoutes } = await import("../src/modules/orders/payment.route.js");
const { default: financeRoutes } = await import("../src/modules/orders/finance.route.js");
const { default: errorMiddleware } = await import("../src/middlewares/error.middleware.js");
const { storage } = await import("../src/modules/orders/proof.storage.js");
const { setup, users, seedShop, seedProduct, fillCart, address, card, models } = await import("./helpers/seed.js");
const { checkout, markCodCollected } = await import("../src/modules/orders/order.service.js");
const { initiatePayfast, confirmPayfast } = await import("../src/modules/orders/payment.service.js");
const { Readable } = await import("node:stream");

const { Payment, Order, Proof } = models;
let server, base, gw, U, shopA, shopB, orderAB, orderA, orderB, paymentAB;
const files = new Map();
storage.put = async (buf) => { const id = String(files.size + 1).padStart(24, "a"); files.set(id, buf); return id; };
storage.openRead = (id) => Readable.from([files.get(String(id))]);
storage.remove = async (id) => files.delete(String(id));

beforeAll(() => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/finance", financeRoutes);
  app.use(errorMiddleware);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => server.close());

const call = async (user, method, path, body, headers = {}) => {
  const h = { ...(user ? { "x-test-user": JSON.stringify(user) } : {}), ...headers };
  let payload = body;
  if (body && !(body instanceof Uint8Array) && typeof body === "object") { payload = JSON.stringify(body); h["content-type"] = "application/json"; }
  const res = await fetch(base + path, { method, headers: h, body: payload });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, headers: res.headers };
};
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 1)]);
const mkOrder = async (lines, method = "cod") => {
  await fillCart(U.customer.id, lines);
  return (await checkout(U.customer, { paymentMethod: method, shippingAddress: address })).order;
};

beforeEach(async () => {
  gw = setup(); files.clear(); U = users();
  shopA = await seedShop(U.sellerA.id, "Shop A"); shopB = await seedShop(U.sellerB.id, "Shop B");
  const pA = await seedProduct(shopA, 1000), pB = await seedProduct(shopB, 500);
  orderAB = await mkOrder([[pA, 1], [pB, 2]]);
  orderA = await mkOrder([[pA, 1]]);
  orderB = await mkOrder([[pB, 1]]);
  await markCodCollected(U.root, orderAB.id);
});

describe("authentication and role gates", () => {
  test("401 without identity on every protected area", async () => {
    for (const p of ["/api/orders", "/api/finance/seller/summary", "/api/finance/admin/shops"]) expect((await call(null, "GET", p)).status).toBe(401);
  });
  test("customer cannot reach seller/admin finance; seller cannot reach admin finance", async () => {
    for (const p of ["/api/finance/seller/summary", "/api/finance/admin/shops", "/api/finance/admin/payments"]) expect((await call(U.customer, "GET", p)).status).toBe(403);
    for (const p of ["/api/finance/admin/shops", `/api/finance/admin/shops/${shopB._id}`, "/api/finance/admin/refunds", "/api/finance/admin/settlements"]) expect((await call(U.sellerA, "GET", p)).status).toBe(403);
  });
  test("admin needs explicit permission; super_admin always allowed", async () => {
    expect((await call(U.adminNone, "GET", "/api/finance/admin/shops")).status).toBe(403);
    expect((await call(U.adminNone, "POST", `/api/finance/admin/orders/${orderA.id}/cod-collected`)).status).toBe(403);
    expect((await call(U.adminAll, "GET", "/api/finance/admin/shops")).status).toBe(200);
    expect((await call(U.root, "GET", "/api/finance/admin/shops")).status).toBe(200);
  });
  test("customers cannot trigger staff-only operations", async () => {
    expect((await call(U.customer, "POST", `/api/finance/admin/orders/${orderA.id}/refunds`, { amount: 1, reason: "abc" })).status).toBe(403);
    expect((await call(U.sellerA, "POST", `/api/finance/admin/settlements`, { shopId: String(shopA._id) })).status).toBe(403);
    expect((await call(U.sellerA, "POST", `/api/finance/admin/orders/${orderA.id}/cod-collected`)).status).toBe(403);
  });
});

describe("seller isolation", () => {
  test("seller sees only their own shop, ignoring any client-supplied shop id", async () => {
    const s = await call(U.sellerA, "GET", `/api/finance/seller/summary?shopId=${shopB._id}`);
    expect(s.json.data.shop.id).toBe(String(shopA._id));
    const list = await call(U.sellerA, "GET", `/api/finance/seller/orders?shopId=${shopB._id}`);
    const ids = list.json.data.map((o) => o.id);
    expect(ids).toContain(orderA.id); expect(ids).toContain(orderAB.id); expect(ids).not.toContain(orderB.id);
  });
  test("multi-shop order is filtered to the seller's own items and totals", async () => {
    const r = await call(U.sellerA, "GET", `/api/orders/${orderAB.id}`);
    expect(r.status).toBe(200);
    expect(r.json.data.items).toHaveLength(1);
    expect(r.json.data.items[0].shopId).toBe(String(shopA._id));
    expect(r.json.data.totalMinor).toBe(100000);
    expect(r.json.data.customerId).toBeUndefined();
    expect((await call(U.sellerA, "GET", `/api/orders/${orderB.id}`)).status).toBe(404);
  });
  test("seller ledger excludes platform/gateway accounts; allocations belong to the shop", async () => {
    const t = await call(U.sellerA, "GET", "/api/finance/seller/transactions");
    expect(t.json.data.length).toBeGreaterThan(0);
    expect(t.json.data.every((r) => r.account === "seller")).toBe(true);
    const a = await call(U.sellerA, "GET", "/api/finance/seller/allocations");
    expect(a.json.data.every((x) => x.shopId === String(shopA._id))).toBe(true);
    const b = await call(U.sellerB, "GET", "/api/finance/seller/allocations");
    expect(b.json.data.every((x) => x.shopId === String(shopB._id))).toBe(true);
  });
  test("customers only see their own orders; others get 404", async () => {
    expect((await call(U.customer2, "GET", `/api/orders/${orderA.id}`)).status).toBe(404);
    expect((await call(U.customer2, "GET", "/api/orders")).json.data).toHaveLength(0);
    expect((await call(U.customer, "GET", "/api/orders")).json.pagination.total).toBe(3);
  });
  test("admin can open any shop profile with history", async () => {
    const r = await call(U.adminAll, "GET", `/api/finance/admin/shops/${shopB._id}`);
    expect(r.status).toBe(200);
    expect(r.json.data.shop.id).toBe(String(shopB._id));
    expect((await call(U.adminAll, "GET", `/api/finance/admin/shops/${shopB._id}/transactions`)).status).toBe(200);
    expect((await call(U.adminAll, "GET", `/api/finance/admin/shops/not-an-id`)).status).toBe(400);
  });
});

describe("validation / mass assignment", () => {
  test("client-supplied amount/price fields are rejected, bad ids rejected", async () => {
    const r = await call(U.customer, "POST", "/api/payments/payfast/initiate", { orderId: orderA.id, accountType: "CARD", mobileNumber: "03451234567", instrument: card, amount: 1 });
    expect(r.status).toBe(400);
    expect((await call(U.customer, "POST", "/api/orders/checkout", { paymentMethod: "cod", shippingAddress: address, total: 1 })).status).toBe(400);
    expect((await call(U.customer, "GET", "/api/orders/xyz")).status).toBe(400);
  });
  test("methods endpoint exposes only configured methods and no secrets", async () => {
    const r = await call(null, "GET", "/api/payments/methods");
    expect(r.json.data.payfast.accountTypes).toEqual(["CARD", "ACCOUNT", "WALLET"]);
    expect(r.text).not.toContain("TEST_SECRET_KEY");
    expect(r.text).not.toContain("TEST_MERCHANT");
  });
});

describe("payment proof upload / retrieval", () => {
  const up = (user, orderId, body, ct = "image/png", qs = "") => call(user, "POST", `/api/orders/${orderId}/payment-proofs${qs}`, body, { "content-type": ct });
  test("owner uploads; metadata stored; binary kept out of the document; never marks paid", async () => {
    const r = await up(U.customer, orderB.id, PNG, "image/png", "?amount=500&reference=TRX1&filename=../../etc/passwd.png");
    expect(r.status).toBe(201);
    expect(r.json.data).toMatchObject({ mimeType: "image/png", declaredAmountMinor: 50000, status: "submitted", originalName: "passwd.png" });
    expect(JSON.stringify(Proof.__store)).not.toContain(PNG.toString("base64"));
    expect((await Order.findById(orderB.id).lean()).paymentStatus).toBe("cod_pending");
  });
  test("rejects wrong type, spoofed content, empty, oversized, other customer", async () => {
    expect((await up(U.customer, orderB.id, Buffer.from("<script>alert(1)</script>".repeat(10)), "image/png")).status).toBe(415);
    expect((await up(U.customer, orderB.id, Buffer.from("hello"), "text/plain")).status).toBe(415);
    expect((await up(U.customer, orderB.id, PNG, "image/jpeg")).status).toBe(415);
    expect((await up(U.customer, orderB.id, Buffer.alloc(3 * 1024 * 1024 + 10, 1), "image/png")).status).toBe(413);
    expect((await up(U.customer2, orderB.id, PNG)).status).toBe(404);
    expect((await up(U.sellerB, orderB.id, PNG)).status).toBe(403);
    expect((await up(null, orderB.id, PNG)).status).toBe(401);
  });
  test("read access: owner and permitted staff only; sellers and other customers cannot", async () => {
    const id = (await up(U.customer, orderB.id, PNG)).json.data.id;
    const f = await call(U.customer, "GET", `/api/payments/proofs/${id}/file`);
    expect(f.status).toBe(200);
    expect(f.headers.get("cache-control")).toBe("private, no-store");
    expect(f.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await call(U.adminAll, "GET", `/api/payments/proofs/${id}/file`)).status).toBe(200);
    expect((await call(U.root, "GET", `/api/payments/proofs/${id}/file`)).status).toBe(200);
    expect((await call(U.adminNone, "GET", `/api/payments/proofs/${id}/file`)).status).toBe(403);
    expect((await call(U.sellerB, "GET", `/api/payments/proofs/${id}/file`)).status).toBe(403);
    expect((await call(U.customer2, "GET", `/api/payments/proofs/${id}/file`)).status).toBe(404);
    expect((await call(null, "GET", `/api/payments/proofs/${id}/file`)).status).toBe(401);
    expect((await call(U.customer2, "GET", `/api/orders/${orderB.id}/payment-proofs`)).status).toBe(404);
    expect((await call(U.sellerB, "GET", `/api/orders/${orderB.id}/payment-proofs`)).status).toBe(403);
    expect((await call(U.customer, "GET", `/api/orders/${orderB.id}/payment-proofs`)).json.data).toHaveLength(1);
  });
  test("staff review changes only the proof, never the payment state", async () => {
    const id = (await up(U.customer, orderB.id, PNG)).json.data.id;
    expect((await call(U.adminNone, "PATCH", `/api/finance/admin/payment-proofs/${id}`, { status: "accepted" })).status).toBe(403);
    expect((await call(U.customer, "PATCH", `/api/finance/admin/payment-proofs/${id}`, { status: "accepted" })).status).toBe(403);
    expect((await call(U.adminAll, "PATCH", `/api/finance/admin/payment-proofs/${id}`, { status: "accepted" })).json.data.status).toBe("accepted");
    expect((await Order.findById(orderB.id).lean()).paymentStatus).toBe("cod_pending");
    expect(await Payment.countDocuments({ orderId: orderB.id })).toBe(0);
  });
  test("max proofs per order", async () => {
    for (let i = 0; i < 5; i++) expect((await up(U.customer, orderB.id, PNG)).status).toBe(201);
    expect((await up(U.customer, orderB.id, PNG)).status).toBe(409);
  });
});

describe("3-D Secure callback route", () => {
  test("rejects bad token; valid token returns framed-by-client-only page and does not pay", async () => {
    await fillCart(U.customer.id, [[(await models.Product.findOne({ shopId: shopA._id }).lean()), 1]]);
    const { order } = await checkout(U.customer, { paymentMethod: "payfast", shippingAddress: address });
    const init = await initiatePayfast(U.customer, "203.0.113.1", { orderId: order.id, accountType: "CARD", mobileNumber: "03451234567", instrument: card });
    const url = new URL(gw.calls.find((c) => c.path === "/transaction/token").form.data_3ds_callback_url);
    const q = url.search;
    expect((await call(null, "POST", `/api/payments/payfast/3ds-callback?p=${init.paymentId}&t=bad`, "PaRes=x", { "content-type": "application/x-www-form-urlencoded" })).status).toBe(400);
    const ok = await call(null, "POST", `/api/payments/payfast/3ds-callback${q}`, "PaRes=ABC&MD=", { "content-type": "application/x-www-form-urlencoded" });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-security-policy")).toContain("frame-ancestors https://shop.test.example");
    expect(ok.headers.get("content-security-policy")).toMatch(/script-src 'sha256-/);
    expect(ok.headers.get("x-frame-options")).toBeNull();
    expect((await Payment.findById(init.paymentId).lean()).status).toBe("pending");
    expect((await call(U.customer2, "GET", `/api/payments/payfast/${init.paymentId}/status`)).status).toBe(404);
    const st = await call(U.customer, "GET", `/api/payments/payfast/${init.paymentId}/status`);
    expect(st.status).toBe(200);
    expect(st.json.data.payment.status).toBe("pending");
  });
});
