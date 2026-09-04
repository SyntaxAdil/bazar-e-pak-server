// src/modules/category/category.route.js
import { Router } from "express";

import {
    createCategory,
    getCategory,
    getCategoryBySlugController,
    getCategories,
    updateCategory,
    deleteCategory,
} from "./category.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

//get categories
router.get(
    "/",
    getCategories,
);

//get category by slug
router.get(
    "/slug/:slug",
    getCategoryBySlugController,
);

//get category
router.get(
    "/:id",
    getCategory,
);

//create category
router.post(
    "/",
    authMiddleware,
    checkRoleMiddleware(
        "super_admin",
    ),
    createCategory,
);

//update category
router.patch(
    "/:id",
    authMiddleware,
    checkRoleMiddleware(
        "super_admin",
    ),
    updateCategory,
);

//delete category
router.delete(
    "/:id",
    authMiddleware,
    checkRoleMiddleware(
        "super_admin",
    ),
    deleteCategory,
);

export default router;