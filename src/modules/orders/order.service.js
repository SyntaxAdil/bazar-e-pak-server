import crypto from "node:crypto";
import Order from "./order.model.js";
import Payment from "./payment.model.js";
import { Cart } from "../cart/cart.model.js";
import Product from "../products/product.model.js";
import Shop from "../shops/shop.model.js";
import { env } from "../../config/env.js";
import { isConfigured } from "./payfast.client.js";
import { ensureFinancials } from "./ledger.service.js";
import { discountedUnitMinor, pkrToMinor, minorToPkr } from "./money.js";
import { httpError, isStaff, assertStaffPermission, getOwnedShop, parsePage, pageMeta, assertObjectId } from "./access.js";

const isDup = (e) => e?.code === 11000;

export const newOrderNumber = () => {
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `PB-${d}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

export const paymentMethodsAvailable = () => ({
  cod: { enabled: env.COD_ENABLED },
  payfast: {
    enabled: isConfigured(),
    environment: env.PAYFAST_ENV,
    // only the account types the merchant enabled in PAYFAST_METHODS (verified API: CARD, ACCOUNT, WALLET)
    accountTypes: isConfigured() ? env.PAYFAST_METHODS.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : [],
    flow: "tokenized-otp-3ds",
  },
});

export const reserveStock = async (items) => {
  const done = [];
  for (const it of items) {
    const r = await Product.updateOne({ _id: it.productId, stock: { $gte: it.quantity } }, { $inc: { stock: -it.quantity } });
    if ((r.modifiedCount ?? r.nModified ?? 0) !== 1) {
      await restoreStock(done);
      throw httpError(`Insufficient stock for ${it.productName || "a product"}`, 409);
    }
    done.push(it);
  }
};
const restoreStock = async (items) => {
  for (const it of items) await Product.updateOne({ _id: it.productId }, { $inc: { stock: it.quantity } });
};

// idempotent: only the caller that flips stockReserved true->false restores stock
export const releaseStock = async (orderId) => {
  const o = await Order.findOneAndUpdate(
    { _id: orderId, stockReserved: true },
    { $set: { stockReserved: false, stockReleasedAt: new Date() } },
    { new: true },
  ).lean();
  if (o) await restoreStock(o.items);
  return Boolean(o);
};

export const checkout = async (user, { paymentMethod, shippingAddress, checkoutKey = null }) => {
  if (user.role !== "customer") throw httpError("Only customers can place orders", 403);
  const methods = paymentMethodsAvailable();
  if (!methods[paymentMethod]?.enabled) throw httpError(`Payment method "${paymentMethod}" is not available`, 400);

  if (checkoutKey) {
    const existing = await Order.findOne({ customerId: user.id, checkoutKey }).lean();
    if (existing) return { order: serializeOrder(existing), reused: true };
  }
  const cart = await Cart.findOne({ user: user.id }).lean();
  if (!cart || !cart.items?.length) throw httpError("Cart is empty", 400);

  const items = [];
  for (const ci of cart.items) {
    const p = await Product.findOne({ _id: ci.product, isDeleted: false }).lean();
    if (!p || p.status !== "active") throw httpError(`"${ci.productName}" is no longer available`, 409);
    if (!p.shopId) throw httpError("Product shop information is missing", 409);
    const shop = await Shop.findOne({ _id: p.shopId, isDeleted: false }).select("_id status sellerId").lean();
    if (!shop || shop.status !== "active") throw httpError(`The shop for "${p.name}" is not accepting orders`, 409);
    const unitMinor = discountedUnitMinor(p.price, p.discount);
    const lineMinor = unitMinor * ci.quantity;
    items.push({
      productId: p._id,
      shopId: p.shopId,
      sellerId: shop.sellerId ? String(shop.sellerId) : p.sellerId || null,
      productName: p.name,
      quantity: ci.quantity,
      unitPrice: minorToPkr(unitMinor),
      unitPriceMinor: unitMinor,
      discount: p.discount || 0,
      lineTotal: minorToPkr(lineMinor),
      lineTotalMinor: lineMinor,
      _grossMinor: pkrToMinor(p.price) * ci.quantity,
    });
  }
  const totalMinor = items.reduce((a, i) => a + i.lineTotalMinor, 0);
  const subtotalMinor = items.reduce((a, i) => a + i._grossMinor, 0);
  if (totalMinor <= 0) throw httpError("Order total must be greater than zero", 400);
  const orderItems = items.map(({ _grossMinor, ...rest }) => rest);

  await reserveStock(orderItems);
  const isCod = paymentMethod === "cod";
  const base = {
    customerId: user.id,
    items: orderItems,
    status: isCod ? "confirmed" : "pending",
    subtotal: minorToPkr(subtotalMinor),
    discountTotal: minorToPkr(subtotalMinor - totalMinor),
    total: minorToPkr(totalMinor),
    totalMinor,
    currency: "PKR",
    shippingAddress,
    paymentMethod,
    paymentStatus: isCod ? "cod_pending" : "unpaid",
    shopIds: [...new Set(orderItems.map((i) => String(i.shopId)))],
    checkoutKey,
    expiresAt: isCod ? null : new Date(Date.now() + env.ORDER_PAYMENT_TTL_MINUTES * 60000),
    stockReserved: true,
  };
  let order = null;
  try {
    for (let i = 0; i < 5 && !order; i++) {
      try {
        order = await Order.create({ ...base, orderNumber: newOrderNumber() });
      } catch (e) {
        if (!isDup(e)) throw e;
        if (checkoutKey) {
          const ex = await Order.findOne({ customerId: user.id, checkoutKey }).lean();
          if (ex) {
            await restoreStock(orderItems);
            return { order: serializeOrder(ex), reused: true };
          }
        }
      }
    }
    if (!order) throw httpError("Could not allocate an order number, retry", 503);
  } catch (e) {
    if (!order) await restoreStock(orderItems);
    throw e;
  }
  await Cart.updateOne({ user: user.id }, { $set: { items: [], totalItems: 0, subtotal: 0 } });
  return { order: serializeOrder(order.toObject ? order.toObject() : order), reused: false };
};

export const serializeOrder = (o, { shopId = null } = {}) => {
  const items = shopId ? o.items.filter((i) => String(i.shopId) === String(shopId)) : o.items;
  const itemsTotal = items.reduce((a, i) => a + (i.lineTotalMinor || 0), 0);
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    currency: o.currency,
    totalMinor: shopId ? itemsTotal : o.totalMinor,
    total: shopId ? minorToPkr(itemsTotal) : o.total,
    refundedMinor: shopId ? undefined : o.refundedMinor,
    items: items.map((i) => ({
      productId: String(i.productId),
      shopId: i.shopId ? String(i.shopId) : null,
      productName: i.productName,
      quantity: i.quantity,
      unitPriceMinor: i.unitPriceMinor,
      lineTotalMinor: i.lineTotalMinor,
      discount: i.discount,
    })),
    shippingAddress: o.shippingAddress,
    paymentId: o.paymentId ? String(o.paymentId) : null,
    expiresAt: o.expiresAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    ...(shopId ? {} : { customerId: o.customerId }),
  };
};

const loadOrderForUser = async (user, orderId) => {
  assertObjectId(orderId, "order ID");
  const o = await Order.findById(orderId).lean();
  if (!o) throw httpError("Order not found", 404);
  if (user.role === "customer") {
    if (o.customerId !== user.id) throw httpError("Order not found", 404);
    return { order: o };
  }
  if (user.role === "seller") {
    const shop = await getOwnedShop(user);
    if (!o.shopIds.map(String).includes(String(shop._id))) throw httpError("Order not found", 404);
    return { order: o, shopId: shop._id };
  }
  assertStaffPermission(user, "orders.view");
  return { order: o };
};
export { loadOrderForUser };

export const getOrder = async (user, orderId) => {
  const { order, shopId } = await loadOrderForUser(user, orderId);
  return serializeOrder(order, { shopId });
};

export const listOrders = async (user, q = {}) => {
  const filter = {};
  let shopId = null;
  if (user.role === "customer") filter.customerId = user.id;
  else if (user.role === "seller") {
    shopId = (await getOwnedShop(user))._id;
    filter.shopIds = shopId;
  } else {
    assertStaffPermission(user, "orders.view");
    if (q.shopId) filter.shopIds = assertObjectId(q.shopId, "shop ID");
    if (q.customerId) filter.customerId = String(q.customerId);
  }
  for (const k of ["status", "paymentStatus", "paymentMethod"]) if (q[k]) filter[k] = String(q[k]);
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) filter.createdAt.$lte = new Date(q.to);
  }
  const p = parsePage(q);
  const [rows, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(),
    Order.countDocuments(filter),
  ]);
  return { data: rows.map((o) => serializeOrder(o, { shopId })), pagination: pageMeta(p, total) };
};

const CANCELLABLE_PAYMENT = ["unpaid", "failed", "cancelled", "cod_pending"];
export const cancelOrder = async (user, orderId) => {
  assertObjectId(orderId, "order ID");
  const inflight = await Payment.findOne({ orderId, status: "pending", stage: "charge_submitted" }).lean();
  if (inflight) throw httpError("A payment is being processed for this order; try again shortly", 409);
  const o = await Order.findOneAndUpdate(
    { _id: orderId, customerId: user.id, status: { $in: ["pending", "confirmed"] }, paymentStatus: { $in: CANCELLABLE_PAYMENT } },
    { $set: { status: "cancelled", paymentStatus: "cancelled", cancelledAt: new Date() } },
    { new: true },
  ).lean();
  if (!o) throw httpError("Order cannot be cancelled", 409);
  await Payment.updateMany({ orderId, status: "pending" }, { $set: { status: "cancelled", failureMessage: "Order cancelled" } });
  await releaseStock(o._id);
  return serializeOrder(o);
};

// No scheduler exists in this backend (serverless-style entrypoint). Call from a cron/admin endpoint.
export const expireStaleOrders = async (now = new Date()) => {
  const stale = await Order.find({
    paymentMethod: "payfast",
    status: "pending",
    paymentStatus: { $in: ["unpaid", "failed", "cancelled"] },
    stockReserved: true,
    expiresAt: { $lt: now },
  })
    .limit(200)
    .lean();
  let expired = 0;
  for (const o of stale) {
    const inflight = await Payment.findOne({ orderId: o._id, status: "pending", stage: "charge_submitted" }).lean();
    if (inflight) continue;
    const u = await Order.findOneAndUpdate(
      { _id: o._id, status: "pending", paymentStatus: { $in: ["unpaid", "failed", "cancelled"] } },
      { $set: { status: "cancelled", paymentStatus: "cancelled", cancelledAt: now } },
      { new: true },
    ).lean();
    if (!u) continue;
    await Payment.updateMany({ orderId: o._id, status: "pending" }, { $set: { status: "timed_out" } });
    await releaseStock(o._id);
    expired++;
  }
  return { expired };
};

// COD is never "paid" at placement. An admin records cash collection explicitly.
export const markCodCollected = async (actor, orderId) => {
  assertStaffPermission(actor, "payments.manage");
  assertObjectId(orderId, "order ID");
  const order = await Order.findById(orderId).lean();
  if (!order || order.paymentMethod !== "cod") throw httpError("COD order not found", 404);
  if (order.status === "cancelled") throw httpError("Order is cancelled", 409);
  if (order.paymentStatus === "cod_pending") {
    await Order.findOneAndUpdate(
      { _id: orderId, paymentMethod: "cod", paymentStatus: "cod_pending", status: { $ne: "cancelled" } },
      { $set: { paymentStatus: "paid", codCollectedAt: new Date(), codCollectedBy: actor.id } },
    );
  }
  const fresh = await Order.findById(orderId).lean();
  if (fresh.paymentStatus !== "paid" && fresh.paymentStatus !== "partially_refunded" && fresh.paymentStatus !== "refunded")
    throw httpError("Order is not awaiting COD collection", 409);
  const basketId = `COD-${fresh.orderNumber}`;
  let payment = await Payment.findOne({ basketId }).lean();
  if (!payment) {
    try {
      payment = (
        await Payment.create({
          orderId: fresh._id,
          customerId: fresh.customerId,
          provider: "cod",
          method: "cod",
          status: "paid",
          stage: "verified",
          amount: fresh.total,
          amountMinor: fresh.totalMinor,
          basketId,
          paidAt: fresh.codCollectedAt || new Date(),
          verifiedAt: new Date(),
          gatewayFeeMinor: 0,
          feeSource: "actual", // no gateway involved -> no gateway fee
          metadata: { collectedBy: actor.id },
        })
      ).toObject();
    } catch (e) {
      if (!isDup(e)) throw e;
      payment = await Payment.findOne({ basketId }).lean();
    }
  }
  await Order.updateOne({ _id: fresh._id }, { $set: { paymentId: payment._id } });
  await ensureFinancials(payment._id);
  return { orderId: String(fresh._id), paymentId: String(payment._id), paymentStatus: "paid" };
};
