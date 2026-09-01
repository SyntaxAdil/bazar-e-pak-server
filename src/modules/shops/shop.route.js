import { Router } from "express";

import {
    createShop,
    deleteShop,
    getShopById,
    getShopBySlug,
    getShops,
    updateShop,
    updateShopStatus,
} from "./shop.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

// Public Routes

// Get all shops
router.get(
    "/",
    getShops,
);

// Get shop by slug
router.get(
    "/slug/:slug",
    getShopBySlug,
);

// Get shop by ID
router.get(
    "/:shopId",
    getShopById,
);

// Seller routes

// Create shop
router.post(
    "/",
    authMiddleware,
    checkRoleMiddleware("seller"),
    createShop,
);

// Update own shop
router.patch(
    "/:shopId",
    authMiddleware,
    checkRoleMiddleware(
        "seller",
        "admin",
    ),
    updateShop,
);

// Delete own shop
router.delete(
    "/:shopId",
    authMiddleware,
    checkRoleMiddleware(
        "seller",
        "admin",
    ),
    deleteShop,
);



//  Admin Routes


// Update shop status
router.patch(
    "/:shopId/status",
    authMiddleware,
    checkRoleMiddleware("admin"),
    updateShopStatus,
);

export default router;