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
import { safeTrack } from "../../utils/analytics.js";

const router = Router();

//get shops
router.get("/", getShops);

//get shop by slug
router.get("/slug/:slug", getShopBySlug);

//track shop interaction
router.post("/:shopId/track", async (req, res, next) => {
  try {
    const allowed = {
      view: "SHOP_VIEW",
      click: "SHOP_CLICK",
      whatsapp: "WHATSAPP_CLICK",
      call: "CALL_CLICK",
      website: "WEBSITE_CLICK",
      location: "LOCATION_CLICK",
      youtube: "YOUTUBE_CLICK",
      social: "SOCIAL_CLICK",
      share: "SHARE",
    };
    const eventType = allowed[String(req.body.type || "")];
    if (!eventType) {
      const e = new Error("Invalid shop tracking type");
      e.statusCode = 400;
      throw e;
    }
    safeTrack(
      {
        eventType,
        shopId: req.params.shopId,
        metadata: req.body.metadata || {},
      },
      req.user || null,
    );
    res
      .status(202)
      .json({ success: true, message: "Shop interaction tracked" });
  } catch (error) {
    next(error);
  }
});

//get shop
router.get("/:shopId", getShopById);

//create shop
router.post("/", authMiddleware, checkRoleMiddleware("seller"), createShop);

//update shop
router.patch(
  "/:shopId",
  authMiddleware,
  checkRoleMiddleware(["seller", "super_admin"]),
  updateShop,
);

//delete shop
router.delete(
  "/:shopId",
  authMiddleware,
  checkRoleMiddleware(["seller", "super_admin"]),
  deleteShop,
);

//update shop status
router.patch(
  "/:shopId/status",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  updateShopStatus,
);

export default router;
