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

const router = express.Router();

//products
router.use(
    "/products",
    productRoutes,
);

//shops
router.use(
    "/shops",
    shopRoutes,
);

//categories
router.use(
    "/categories",
    categoryRoutes,
);

//reviews
router.use(
    "/reviews",
    reviewRoutes,
);

//cart
router.use(
    "/cart",
    cartRoutes,
);

//users
router.use(
    "/users",
    userRoutes,
);

//analytics
router.use(
    "/analytics",
    analyticsRoutes,
);

//seller applications
router.use(
    "/seller-applications",
    sellerApplicationRoutes,
);

//audit logs
router.use(
    "/audit-logs",
    auditRoutes,
);

export default router;