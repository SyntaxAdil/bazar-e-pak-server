import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import {
  trackEvent,
  getAnalyticsController,
  dashboardAnalytics,
  productAnalytics,
  shopAnalytics,
  sellerAnalytics,
  productRankings,
} from "./analytics.controller.js";
const r = Router();
r.post("/events", trackEvent);
r.get(
  "/",
  authMiddleware,
  checkRoleMiddleware(["admin", "seller", "super_admin"]),
  getAnalyticsController,
);
r.get(
  "/dashboard",
  authMiddleware,
  checkRoleMiddleware(["admin", "seller", "super_admin"]),
  dashboardAnalytics,
);
r.get(
  "/products/:id",
  authMiddleware,
  checkRoleMiddleware(["admin", "seller", "super_admin"]),
  productAnalytics,
);
r.get(
  "/shops/:id",
  authMiddleware,
  checkRoleMiddleware(["admin", "seller", "super_admin"]),
  shopAnalytics,
);
r.get(
  "/seller",
  authMiddleware,
  checkRoleMiddleware(["admin", "seller", "super_admin"]),
  sellerAnalytics,
);
r.get(
  "/rankings/products",
  authMiddleware,
  checkRoleMiddleware(["admin", "seller", "super_admin"]),
  productRankings,
);
export default r;
