import { Router } from "express";

import { getUsers, updateUserStatus } from "./user.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";

const router = Router();

router.get(
    "/",
    authMiddleware,
    checkRoleMiddleware(["admin"]),
    getUsers,
);

router.patch(
    "/:userId/status",
    authMiddleware,
    checkRoleMiddleware(["admin"]),
    updateUserStatus,
);

export default router;