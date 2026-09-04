import { Router } from "express";
import { getTrendingProducts } from "./trending.js";
import {
  createProduct,
  getProduct,
  getProducts,
  getSellerProducts,
  updateProduct,
  deleteProduct,
  setProductFeatured,
  trackProduct,
  getBestSelling,
} from "./product.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
const router = Router();
router.get("/best-selling", getBestSelling);
router.get("/trending", async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getTrendingProducts({ limit: req.query.limit }),
    });
  } catch (e) {
    next(e);
  }
});
router.get(
  "/seller",
  authMiddleware,
  checkRoleMiddleware("seller"),
  getSellerProducts,
);
router.get("/", getProducts);
router.get("/:id", getProduct);
router.post(
  "/",
  authMiddleware,
  checkRoleMiddleware(["seller", "super_admin"]),
  createProduct,
);
router.patch(
  "/:id",
  authMiddleware,
  checkRoleMiddleware(["seller", "super_admin"]),
  updateProduct,
);
router.delete(
  "/:id",
  authMiddleware,
  checkRoleMiddleware(["seller", "admin", "super_admin"]),
  deleteProduct,
);
router.patch(
  "/:id/featured",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  setProductFeatured,
);
router.post("/:id/track", trackProduct);
export default router;
