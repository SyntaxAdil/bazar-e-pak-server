import { Router } from "express";

import productRoutes from "../modules/products/product.route.js";
import shopRoutes from "../modules/shops/shop.route.js";

const router = Router();

router.use(
  "/products",
  productRoutes,
);

router.use(
  "/shops",
  shopRoutes,
);

export default router;