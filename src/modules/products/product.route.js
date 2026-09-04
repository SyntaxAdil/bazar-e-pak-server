// src/modules/products/product.route.js
import { Router } from "express";

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

//get best selling
router.get(
    "/best-selling",
    getBestSelling,
);

//get products
router.get(
    "/",
    getProducts,
);

//get product
router.get(
    "/:id",
    getProduct,
);

//get seller products
router.get(
    "/seller",
    authMiddleware,
    checkRoleMiddleware([
        "seller",
    ]),
    getSellerProducts,
);

//create product
router.post(
    "/",
    authMiddleware,
    checkRoleMiddleware([
        "seller",
        "super_admin",
    ]),
    createProduct,
);

//update product
router.patch(
    "/:id",
    authMiddleware,
    checkRoleMiddleware([
        "seller",
        "super_admin",
    ]),
    updateProduct,
);

//delete product
router.delete(
    "/:id",
    authMiddleware,
    checkRoleMiddleware([
        "seller",
        "admin",
        "super_admin",
    ]),
    deleteProduct,
);

//feature product
router.patch(
    "/:id/featured",
    authMiddleware,
    checkRoleMiddleware(
        "super_admin",
    ),
    setProductFeatured,
);

//track product
router.post(
    "/:id/track",
    trackProduct,
);

export default router;