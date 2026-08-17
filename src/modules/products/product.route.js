import { Router } from "express";

import {
  createProduct,
  getProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} from "./product.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

// Public product browsing
router.get("/", getProducts);

router.get("/:id", getProduct);

// Seller + Admin product management
router.post(
  "/",
  authMiddleware,
  checkRoleMiddleware([
    "seller",
    "admin",
  ]),
  createProduct,
);

router.patch(
  "/:id",
  authMiddleware,
  checkRoleMiddleware([
    "seller",
    "admin",
  ]),
  updateProduct,
);

router.delete(
  "/:id",
  authMiddleware,
  checkRoleMiddleware([
    "seller",
    "admin",
  ]),
  deleteProduct,
);

export default router;