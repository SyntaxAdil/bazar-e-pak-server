import { Router } from "express";

import productRoutes from "../modules/products/product.route.js";


const router = Router();

router.use("/products", productRoutes);


export default router;