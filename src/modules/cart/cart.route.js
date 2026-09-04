// src/modules/cart/cart.route.js
import { Router } from "express";

import {
  getCartController,
  addToCartController,
  updateCartItemController,
  removeCartItemController,
  clearCartController,
} from "./cart.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

//get cart
router.get(
  "/",
  authMiddleware,
  checkRoleMiddleware("customer"),
  getCartController,
);

//add item
router.post(
  "/items",
  authMiddleware,
  checkRoleMiddleware("customer"),
  addToCartController,
);

//update item
router.patch(
  "/items/:productId",
  authMiddleware,
  checkRoleMiddleware("customer"),
  updateCartItemController,
);

//remove item
router.delete(
  "/items/:productId",
  authMiddleware,
  checkRoleMiddleware("customer"),
  removeCartItemController,
);

//clear cart
router.delete(
  "/",
  authMiddleware,
  checkRoleMiddleware("customer"),
  clearCartController,
);

export default router;
