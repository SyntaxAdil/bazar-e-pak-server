// src/modules/reviews/review.route.js

import { Router } from "express";

import {
    createReview,
    deleteReview,
    getReviewById,
    getReviews,
    getManagedReviews,
    moderateReview,
} from "./review.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();


// PUBLIC - get reviews
router.get(
    "/",
    getReviews,
);


// ADMIN / SUPER ADMIN - dashboard reviews
// IMPORTANT: this MUST be before "/:id"
router.get(
    "/manage",
    authMiddleware,
    checkRoleMiddleware([
        "admin",
        "super_admin",
    ]),
    getManagedReviews,
);


// PUBLIC - get single review
router.get(
    "/:id",
    getReviewById,
);


// CUSTOMER - create review
router.post(
    "/",
    authMiddleware,
    checkRoleMiddleware(
        "customer",
    ),
    createReview,
);


// CUSTOMER / ADMIN / SUPER ADMIN - remove review
router.delete(
    "/:id",
    authMiddleware,
    checkRoleMiddleware([
        "customer",
        "admin",
        "super_admin",
    ]),
    deleteReview,
);


// ADMIN / SUPER ADMIN - moderate review
router.patch(
    "/:id/moderation",
    authMiddleware,
    checkRoleMiddleware([
        "admin",
        "super_admin",
    ]),
    moderateReview,
);

export default router;