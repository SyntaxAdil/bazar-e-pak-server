import {
  analyticsEventSchema,
  analyticsQuerySchema,
} from "./analytics.validation.js";
import {
  trackAnalyticsEvent,
  getAnalytics,
  getDashboardAnalytics,
  getProductAnalytics,
  getShopAnalytics,
  getSellerAnalytics,
  getProductRankings,
} from "./analytics.service.js";
export const trackEvent = async (req, res, next) => {
  try {
    const d = analyticsEventSchema.parse(req.body);
    res
      .status(201)
      .json({ success: true, data: await trackAnalyticsEvent(d, req.user) });
  } catch (e) {
    next(e);
  }
};
export const getAnalyticsController = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getAnalytics(analyticsQuerySchema.parse(req.query), req.user),
    });
  } catch (e) {
    next(e);
  }
};
export const dashboardAnalytics = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getDashboardAnalytics(req.query, req.user),
    });
  } catch (e) {
    next(e);
  }
};
export const productAnalytics = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getProductAnalytics(req.params.id, req.query, req.user),
    });
  } catch (e) {
    next(e);
  }
};
export const shopAnalytics = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getShopAnalytics(req.params.id, req.query, req.user),
    });
  } catch (e) {
    next(e);
  }
};
export const sellerAnalytics = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getSellerAnalytics(req.query, req.user),
    });
  } catch (e) {
    next(e);
  }
};
export const productRankings = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getProductRankings(req.query, req.user),
    });
  } catch (e) {
    next(e);
  }
};
