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
import { safeTrack } from "../../utils/analytics.js";

const router = Router();

//get categories
router.get("/", getCategories);

//get category by slug
router.get("/slug/:slug", getCategoryBySlugController);

//track category view
router.post("/:id/track", async (req, res, next) => {
  try {
    safeTrack(
      {
        eventType: "CATEGORY_VIEW",
        categoryId: req.params.id,
        metadata: req.body?.metadata || {},
      },
      req.user || null,
    );
    res.status(202).json({ success: true, message: "Category view tracked" });
  } catch (e) {
    next(e);
  }
});

//get category
router.get("/:id", getCategory);

//create category
router.post(
  "/",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  createCategory,
);

//update category
router.patch(
  "/:id",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  updateCategory,
);

//delete category
router.delete(
  "/:id",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  deleteCategory,
);

export default router;
