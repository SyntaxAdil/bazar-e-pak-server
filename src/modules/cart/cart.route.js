import { Router } from "express";

import {
  getCartController,
  addToCartController,
  updateCartItemController,
  removeCartItemController,
  clearCartController,
} from "./cart.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  getCartController
);

router.post(
  "/items",
  authMiddleware,
  addToCartController
);

router.patch(
  "/items/:productId",
  authMiddleware,
  updateCartItemController
);

router.delete(
  "/items/:productId",
  authMiddleware,
  removeCartItemController
);

router.delete(
  "/",
  authMiddleware,
  clearCartController
);

export default router;