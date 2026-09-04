// src/modules/audit/audit.route.js
import { Router } from "express";

import {
    getAuditLogsController,
} from "./audit.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

//get audit logs
router.get(
    "/",
    authMiddleware,
    checkRoleMiddleware(
        "super_admin",
    ),
    getAuditLogsController,
);

export default router;