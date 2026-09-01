import { Router } from "express";

import {
    createReview,
    deleteReview,
    getReviewById,
    getReviews,
} from "./review.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

const router = Router();

// Public Routes

// Get all reviews or filter by product/shop
router.get(
    "/",
    getReviews,
);

// Get review by ID
router.get(
    "/:id",
    getReviewById,
);

// Authenticated Routes

// Create review
router.post(
    "/",
    authMiddleware,
    createReview,
);

// Delete own review
router.delete(
    "/:id",
    authMiddleware,
    deleteReview,
);

export default router;