import { Router } from "express";
import AnalyticsEvent from "../analytics/analytics.model.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
const r = Router();
r.post("/track", async (req, res, next) => {
  try {
    const keyword = String(req.body.keyword || "").trim();
    if (!keyword) {
      const e = new Error("keyword is required");
      e.statusCode = 400;
      throw e;
    }
    const d = await AnalyticsEvent.create({
      eventType: "SEARCH",
      userId: req.user?.id ? String(req.user.id) : null,
      visitorId: req.body.visitorId || null,
      searchKeyword: keyword,
      resultCount: Math.max(0, Number(req.body.resultCount || 0)),
      source: req.body.source || null,
      page: req.body.page || null,
      metadata: req.body.metadata || {},
    });
    res.status(201).json({ success: true, data: d });
  } catch (e) {
    next(e);
  }
});
r.post("/click", async (req, res, next) => {
  try {
    const d = await AnalyticsEvent.create({
      eventType: "PRODUCT_CLICK",
      userId: req.user?.id ? String(req.user.id) : null,
      productId: req.body.productId || null,
      shopId: req.body.shopId || null,
      searchKeyword: String(req.body.keyword || "").trim() || null,
      source: req.body.source || "search",
      metadata: { resultPosition: req.body.resultPosition ?? null },
    });
    res.status(201).json({ success: true, data: d });
  } catch (e) {
    next(e);
  }
});
r.get(
  "/",
  authMiddleware,
  checkRoleMiddleware(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1)),
        limit = Math.min(100, Number(req.query.limit || 20));
      const match = { eventType: "SEARCH" };
      if (req.query.keyword)
        match.searchKeyword = {
          $regex: String(req.query.keyword).trim(),
          $options: "i",
        };
      const [rows, total] = await Promise.all([
        AnalyticsEvent.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$searchKeyword",
              searches: { $sum: 1 },
              noResults: {
                $sum: { $cond: [{ $eq: ["$resultCount", 0] }, 1, 0] },
              },
            },
          },
          { $sort: { searches: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ]),
        AnalyticsEvent.countDocuments(match),
      ]);
      res.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);
export default r;
