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

// Public

// Get all categories
router.get(
    "/",
    getCategories,
);

// Get category by slug
router.get(
    "/slug/:slug",
    getCategoryBySlugController,
);

// Get category by ID
router.get(
    "/:id",
    getCategory,
);

// Admin

// Admin creates category
router.post(
    "/",
    authMiddleware,
    checkRoleMiddleware(["admin"]),
    createCategory,
);

// Admin updates category
router.patch(
    "/:id",
    authMiddleware,
    checkRoleMiddleware(["admin"]),
    updateCategory,
);

// Admin deletes category
router.delete(
    "/:id",
    authMiddleware,
    checkRoleMiddleware(["admin"]),
    deleteCategory,
);

export default router;