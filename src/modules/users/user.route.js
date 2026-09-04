// src/modules/users/user.route.js
import { Router } from "express";

import {
    getUsers,
    updateUserRole,
    updateUserStatus,
} from "./user.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

//get users
router.get(
    "/",
    authMiddleware,
    checkRoleMiddleware([
        "admin",
        "super_admin",
    ]),
    getUsers,
);

//update user status
router.patch(
    "/:userId/status",
    authMiddleware,
    checkRoleMiddleware([
        "admin",
        "super_admin",
    ]),
    updateUserStatus,
);

//update user role
router.patch(
    "/:userId/role",
    authMiddleware,
    checkRoleMiddleware(
        "super_admin",
    ),
    updateUserRole,
);

export default router;