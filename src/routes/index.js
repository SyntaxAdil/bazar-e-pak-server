// src/routes/index.js
import express from "express";

import productRoutes from "../modules/products/product.route.js";
import shopRoutes from "../modules/shops/shop.route.js";
import categoryRoutes from "../modules/category/category.route.js";
import reviewRoutes from "../modules/reviews/review.route.js";
import cartRoutes from "../modules/cart/cart.route.js";
import userRoutes from "../modules/users/user.route.js";
import analyticsRoutes from "../modules/analytics/analytics.route.js";
import sellerApplicationRoutes from "../modules/seller-applications/seller-application.route.js";
import auditRoutes from "../modules/audit/audit.route.js";
import nativeProductRoutes from "../modules/products/native-product.route.js";
import campaignRoutes from "../modules/campaigns/campaign.route.js";
import cmsRoutes from "../modules/cms/cms.route.js";
import teamRoutes from "../modules/team/team.route.js";
import notificationRoutes from "../modules/notifications/notification.route.js";
import searchAnalyticsRoutes from "../modules/search-analytics/search-analytics.route.js";
import systemHealthRoutes from "../modules/system-health/system-health.route.js";
import offerRoutes from "../modules/offers/offer.route.js";
import settingsRoutes from "../modules/settings/settings.route.js";
import searchRoutes from "../modules/search/search.route.js";
import nativeShopRoutes from "../modules/shops/native-shop.route.js";

const router = express.Router();

//products
router.use("/products", productRoutes);

//shops
router.use("/shops", shopRoutes);

//categories
router.use("/categories", categoryRoutes);

//reviews
router.use("/reviews", reviewRoutes);

//cart
router.use("/cart", cartRoutes);

//users
router.use("/users", userRoutes);

//analytics
router.use("/analytics", analyticsRoutes);

//seller applications
router.use("/seller-applications", sellerApplicationRoutes);

//audit logs
router.use("/audit-logs", auditRoutes);
router.use("/native-products", nativeProductRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/cms", cmsRoutes);
router.use("/team", teamRoutes);
router.use("/notifications", notificationRoutes);
router.use("/search-analytics", searchAnalyticsRoutes);
router.use("/system-health", systemHealthRoutes);
router.use("/offers", offerRoutes);
router.use("/settings", settingsRoutes);
router.use("/search", searchRoutes);
router.use("/native-shops", nativeShopRoutes);

export default router;
