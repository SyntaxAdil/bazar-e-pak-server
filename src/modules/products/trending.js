import AnalyticsEvent from "../analytics/analytics.model.js";
import Product from "./product.model.js";
export const getTrendingProducts = async ({ limit = 10 } = {}) => {
  const daysAgo = new Date(Date.now() - 30 * 86400000);
  const rows = await AnalyticsEvent.aggregate([
    {
      $match: {
        createdAt: { $gte: daysAgo },
        $or: [
          { eventType: "PRODUCT_VIEW" },
          { eventType: "PRODUCT_CLICK" },
          { eventType: "ADD_TO_CART" },
        ],
      },
    },
    {
      $group: {
        _id: "$productId",
        views: {
          $sum: { $cond: [{ $eq: ["$eventType", "PRODUCT_VIEW"] }, 1, 0] },
        },
        clicks: {
          $sum: { $cond: [{ $eq: ["$eventType", "PRODUCT_CLICK"] }, 1, 0] },
        },
        carts: {
          $sum: { $cond: [{ $eq: ["$eventType", "ADD_TO_CART"] }, 1, 0] },
        },
      },
    },
    { $match: { _id: { $ne: null } } },
    { $sort: { views: -1, clicks: -1, carts: -1 } },
    { $limit: Math.min(50, Number(limit)) },
  ]);
  const ids = rows.map((r) => r._id);
  const products = await Product.find({
    _id: { $in: ids },
    isDeleted: false,
    status: "active",
    averageRating: { $gte: 3 },
  }).lean();
  const score = new Map(
    rows.map((r) => [String(r._id), r.views + 2 * r.clicks + 3 * r.carts]),
  );
  return products
    .sort(
      (a, b) =>
        (score.get(String(b._id)) || 0) - (score.get(String(a._id)) || 0),
    )
    .slice(0, Number(limit));
};
