import { Router } from "express";

import {
  createProduct,
  getProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  setProductFeatured,
  trackProduct,
  getBestSelling,
} from "./product.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

router.get(
  "/best-selling",
  getBestSelling,
);

router.get(
  "/",
  getProducts,
);

router.get(
  "/:id",
  getProduct,
);

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

router.patch(
  "/:id/featured",
  authMiddleware,
  checkRoleMiddleware([
    "seller",
    "admin",
  ]),
  setProductFeatured,
);

router.post(
  "/:id/track",
  trackProduct,
);

export default router;