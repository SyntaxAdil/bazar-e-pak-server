import express from "express";

import productRoutes from "../modules/products/product.route.js";
import shopRoutes from "../modules/shops/shop.route.js";
import categoryRoutes from "../modules/category/category.route.js";
import reviewRoutes from "../modules/reviews/review.route.js";
import cartRoutes from "../modules/cart/cart.route.js";
import userRoutes from "../modules/users/user.route.js";

const router = express.Router();

router.use("/products", productRoutes);
router.use("/shops", shopRoutes);
router.use("/categories", categoryRoutes);
router.use("/reviews", reviewRoutes);
router.use("/cart", cartRoutes);
router.use("/users", userRoutes);
export default router;