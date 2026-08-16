import express from "express";

import productRoutes from "../modules/products/product.route.js";
import shopRoutes from "../modules/shops/shop.route.js";
import categoryRoutes from "../modules/category/category.route.js";

const router = express.Router();

router.use("/products", productRoutes);
router.use("/shops", shopRoutes);
router.use("/categories", categoryRoutes);

export default router;