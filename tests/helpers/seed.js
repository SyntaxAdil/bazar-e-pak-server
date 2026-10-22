import { installFake, oid } from "./fake-db.js";
import { makeGateway } from "./fake-gateway.js";
import Order from "../../src/modules/orders/order.model.js";
import Payment from "../../src/modules/orders/payment.model.js";
import Refund from "../../src/modules/orders/refund.model.js";
import Allocation from "../../src/modules/orders/allocation.model.js";
import Ledger from "../../src/modules/orders/ledger.model.js";
import Proof from "../../src/modules/orders/proof.model.js";
import Settlement from "../../src/modules/orders/settlement.model.js";
import Shop from "../../src/modules/shops/shop.model.js";
import Product from "../../src/modules/products/product.model.js";
import { Cart } from "../../src/modules/cart/cart.model.js";
import AuditLog from "../../src/modules/audit/audit.model.js";

export const models = { Order, Payment, Refund, Allocation, Ledger, Proof, Settlement, Shop, Product, Cart, AuditLog };
let installed = false;
export const setup = () => {
  if (!installed) {
    for (const [k, M] of Object.entries(models)) installFake(M, { selectFalse: k === "Payment" ? ["secret"] : [] });
    installed = true;
  }
  for (const M of Object.values(models)) M.__reset();
  return makeGateway();
};

export const users = () => {
  const mk = (role, extra = {}) => ({ id: String(oid()), role, permissions: [], ...extra });
  return {
    customer: mk("customer"),
    customer2: mk("customer"),
    sellerA: mk("seller"),
    sellerB: mk("seller"),
    root: mk("super_admin"),
    adminNone: mk("admin"),
    adminAll: mk("admin", { permissions: ["orders.view", "payments.view", "payments.refund", "payments.manage", "settlements.manage"] }),
  };
};

export const seedShop = async (sellerId, name, source = "seller") =>
  (await Shop.create({ sellerId: sellerId ? String(sellerId) : null, name, slug: name.toLowerCase().replace(/\W+/g, "-") + Math.random().toString(36).slice(2, 6), status: "active", source })).toObject();

export const seedProduct = async (shop, price, { stock = 50, discount = 0, name = "Item" } = {}) =>
  (await Product.create({ name: `${name} ${Math.random().toString(36).slice(2, 5)}`, description: "d", price, discount, stock, categoryId: oid(), shopId: shop._id, sellerId: shop.sellerId ? String(shop.sellerId) : null })).toObject();

export const fillCart = async (userId, lines) => {
  await Cart.deleteOne({ user: userId });
  await Cart.create({ user: userId, items: lines.map(([p, q]) => ({ product: p._id, shop: p.shopId, quantity: q, price: p.price, productName: p.name })) });
};

export const address = { fullName: "Ali Khan", phone: "03451234567", addressLine: "House 1, Street 2", city: "Karachi" };
export const card = { card_number: "4111111111111111", expiry_month: "09", expiry_year: "29", cvv: "123" };
