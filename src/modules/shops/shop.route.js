// src/modules/shops/shop.route.js
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

//get shops
router.get(
    "/",
    getShops,
);

//get shop by slug
router.get(
    "/slug/:slug",
    getShopBySlug,
);

//get shop
router.get(
    "/:shopId",
    getShopById,
);

//create shop
router.post(
    "/",
    authMiddleware,
    checkRoleMiddleware(
        "seller",
    ),
    createShop,
);

//update shop
router.patch(
    "/:shopId",
    authMiddleware,
    checkRoleMiddleware([
        "seller",
        "super_admin",
    ]),
    updateShop,
);

//delete shop
router.delete(
    "/:shopId",
    authMiddleware,
    checkRoleMiddleware([
        "seller",
        "super_admin",
    ]),
    deleteShop,
);

//update shop status
router.patch(
    "/:shopId/status",
    authMiddleware,
    checkRoleMiddleware(
        "super_admin",
    ),
    updateShopStatus,
);

export default router;