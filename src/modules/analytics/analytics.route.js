// src/modules/analytics/analytics.route.js
import { Router } from "express";

import {
    trackEvent,
    getAnalyticsController,
} from "./analytics.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

//track event
router.post(
    "/events",
    trackEvent,
);

//get analytics
router.get(
    "/",
    authMiddleware,
    checkRoleMiddleware([
        "seller",
        "admin",
        "super_admin",
    ]),
    getAnalyticsController,
);

export default router;