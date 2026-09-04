// src/modules/reviews/review.route.js
import { Router } from "express";

import {
    createReview,
    deleteReview,
    getReviewById,
    getReviews,
    moderateReview,
} from "./review.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

//get reviews
router.get(
    "/",
    getReviews,
);

//get review
router.get(
    "/:id",
    getReviewById,
);

//create review
router.post(
    "/",
    authMiddleware,
    checkRoleMiddleware(
        "customer",
    ),
    createReview,
);

//delete review
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

//moderate review
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