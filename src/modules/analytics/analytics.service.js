import {
  createAnalyticsEvent,
  aggregateAnalytics,
} from "./analytics.repository.js";
import Product from "../products/product.model.js";
import Shop from "../shops/shop.model.js";
import User from "../users/user.model.js";
import Review from "../reviews/review.model.js";
const err = (m, c = 400) => Object.assign(new Error(m), { statusCode: c });
export const trackAnalyticsEvent = async (data, user) => {
  const event = { ...data, userId: user?.id ? String(user.id) : null };
  if (data.productId) {
    const p = await Product.findOne({
      _id: data.productId,
      isDeleted: false,
    }).lean();
    if (!p) throw err("Product not found", 404);
    event.shopId = p.shopId || null;
    event.sellerId = p.sellerId || null;
    event.categoryId = p.categoryId || null;
  }
  if (data.shopId) {
    const s = await Shop.findOne({ _id: data.shopId, isDeleted: false }).lean();
    if (!s) throw err("Shop not found", 404);
    event.sellerId = String(s.sellerId);
  }
  return createAnalyticsEvent(event);
};
const dateMatch = (q) => {
  const m = {};
  if (q.startDate || q.endDate) {
    m.createdAt = {};
    if (q.startDate) m.createdAt.$gte = new Date(q.startDate);
    if (q.endDate) m.createdAt.$lte = new Date(q.endDate);
  }
  return m;
};
export const getAnalytics = async (query, user) => {
  const match = dateMatch(query);
  if (query.eventType) match.eventType = query.eventType;
  if (query.productId) match.productId = query.productId;
  if (query.shopId) match.shopId = query.shopId;
  if (user?.role === "seller") match.sellerId = String(user.id);
  else if (query.sellerId) {
    if (user?.role !== "super_admin")
      throw err(
        "Only the Super Admin can inspect another seller's analytics",
        403,
      );
    match.sellerId = String(query.sellerId);
  }
  const [summary, byEvent] = await Promise.all([
    aggregateAnalytics([
      { $match: match },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]),
    aggregateAnalytics([
      { $match: match },
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);
  return { totalEvents: summary[0]?.total || 0, byEvent };
};
const assertAdminAnalytics = (u) => {
  if (!["admin", "super_admin", "seller"].includes(u?.role))
    throw err("Forbidden", 403);
  if (u.role === "admin" && !u.permissions?.includes("analytics.view"))
    throw err("Analytics permission required", 403);
};
export const getDashboardAnalytics = async (query, user) => {
  assertAdminAnalytics(user);
  const match = dateMatch(query);
  if (user.role === "seller") match.sellerId = String(user.id);
  const events = await AnalyticsEvent.aggregate([
    { $match: match },
    { $group: { _id: "$eventType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const [users, shops, products, reviews] = await Promise.all([
    User.countDocuments(),
    Shop.countDocuments({ isDeleted: false }),
    Product.countDocuments({ isDeleted: false }),
    Review.countDocuments({ status: "published" }),
  ]);
  const [sellerProducts, nativeProducts, sellerShops, nativeShops] =
    await Promise.all([
      Product.countDocuments({ source: "seller", isDeleted: false }),
      Product.countDocuments({ source: "pakbazaar", isDeleted: false }),
      Shop.countDocuments({ isDeleted: false }),
      Shop.countDocuments({ isDeleted: false, sellerId: null }),
    ]);
  return {
    totals: { users, shops, products, reviews },
    sourceComparison: {
      externalSellerProducts: sellerProducts,
      nativeProducts,
      externalSellerShops: sellerShops,
      nativeShops,
    },
    events,
  };
};
export const getProductAnalytics = async (id, q, user) => {
  assertAdminAnalytics(user);
  const p = await Product.findOne({ _id: id, isDeleted: false }).lean();
  if (!p) throw err("Product not found", 404);
  if (user.role === "seller" && String(p.sellerId) !== String(user.id))
    throw err("Forbidden", 403);
  const match = { ...dateMatch(q), productId: id };
  const rows = await aggregateAnalytics([
    { $match: match },
    { $group: { _id: "$eventType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return { product: p, events: rows };
};
export const getShopAnalytics = async (id, q, user) => {
  assertAdminAnalytics(user);
  const s = await Shop.findOne({ _id: id, isDeleted: false }).lean();
  if (!s) throw err("Shop not found", 404);
  if (user.role === "seller" && String(s.sellerId) !== String(user.id))
    throw err("Forbidden", 403);
  const rows = await aggregateAnalytics([
    { $match: { ...dateMatch(q), shopId: id } },
    { $group: { _id: "$eventType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return {
    shop: s,
    events: rows,
    productCount: await Product.countDocuments({
      shopId: id,
      isDeleted: false,
    }),
  };
};
export const getSellerAnalytics = async (query, user) => {
  const sellerId = user.role === "seller" ? String(user.id) : query.sellerId;
  if (!sellerId) throw err("sellerId is required", 400);
  if (
    user.role !== "seller" &&
    user.role !== "super_admin" &&
    user.role !== "admin"
  )
    throw err("Forbidden", 403);
  if (user.role === "admin" && !user.permissions?.includes("analytics.view"))
    throw err("Analytics permission required", 403);
  const rows = await aggregateAnalytics([
    { $match: { ...dateMatch(query), sellerId: String(sellerId) } },
    { $group: { _id: "$eventType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return { sellerId: String(sellerId), events: rows };
};
export const getProductRankings = async (query, user) => {
  assertAdminAnalytics(user);
  const days = new Date(Date.now() - 30 * 86400000);
  const rows = await aggregateAnalytics([
    {
      $match: {
        createdAt: { $gte: query.startDate ? new Date(query.startDate) : days },
        ...(user.role === "seller" ? { sellerId: String(user.id) } : {}),
      },
    },
    {
      $group: {
        _id: "$productId",
        views: {
          $sum: { $cond: [{ $eq: ["$eventType", "PRODUCT_VIEW"] }, 1, 0] },
        },
        clicks: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$eventType",
                  [
                    "PRODUCT_CLICK",
                    "WHATSAPP_CLICK",
                    "CALL_CLICK",
                    "WEBSITE_CLICK",
                  ],
                ],
              },
              1,
              0,
            ],
          },
        },
        carts: {
          $sum: { $cond: [{ $eq: ["$eventType", "ADD_TO_CART"] }, 1, 0] },
        },
      },
    },
    { $match: { _id: { $ne: null } } },
    { $sort: { views: -1, clicks: -1, carts: -1 } },
    { $limit: 20 },
  ]);
  return rows;
};
