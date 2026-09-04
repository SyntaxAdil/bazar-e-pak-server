// src/modules/seller-applications/seller-application.route.js
import { Router } from "express";

import {
    createSellerApplication,
    getMySellerApplication,
    getApplications,
    reviewApplication,
} from "./seller-application.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

//apply seller
router.post(
    "/",
    authMiddleware,
    checkRoleMiddleware(
        "customer",
    ),
    createSellerApplication,
);

//get my application
router.get(
    "/me",
    authMiddleware,
    checkRoleMiddleware([
        "customer",
        "seller",
    ]),
    getMySellerApplication,
);

//get applications
router.get(
    "/",
    authMiddleware,
    checkRoleMiddleware(
        "super_admin",
    ),
    getApplications,
);

//review application
router.patch(
    "/:id",
    authMiddleware,
    checkRoleMiddleware(
        "super_admin",
    ),
    reviewApplication,
);

export default router;