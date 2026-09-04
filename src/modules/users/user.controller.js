// src/modules/users/user.controller.js
import {
    getAllUsers,
    updateUserRoleService,
    updateUserStatusService,
} from "./user.service.js";

import {
    userIdSchema,
    userQuerySchema,
    updateUserRoleSchema,
    updateUserStatusSchema,
    updateAdminPermissionsSchema,
} from "./user.validation.js";
import { updateAdminPermissions } from "./user-permission.js";
import { safeAudit } from "../../utils/audit.js";

//get users
export const getUsers = async (
    req,
    res,
    next,
) => {
    try {
        const query =
            userQuerySchema.parse(
                req.query,
            );

        const result =
            await getAllUsers(
                query,
                req.user,
            );

        return res.status(200).json({
            success: true,
            message:
                "Users fetched successfully",
            data: result.users,
            pagination:
                result.pagination,
        });
    } catch (error) {
        next(error);
    }
};

export const updatePermissions = async (req, res, next) => {
    try {
        const { userId } = userIdSchema.parse(req.params);
        const { permissions } = updateAdminPermissionsSchema.parse(req.body);
        const user = await updateAdminPermissions(userId, permissions, req.user);
        await safeAudit({ actor:req.user, action:"ADMIN_PERMISSIONS_CHANGED", resourceType:"User", resourceId:userId, newState:{permissions}, metadata:{} });
        res.json({success:true,message:"Admin permissions updated successfully",data:user});
    } catch (error) { next(error); }
};

//update user status
export const updateUserStatus =
    async (
        req,
        res,
        next,
    ) => {
        try {
            const { userId } =
                userIdSchema.parse(
                    req.params,
                );

            const data =
                updateUserStatusSchema.parse(
                    req.body,
                );

            const user =
                await updateUserStatusService(
                    {
                        userId,
                        ...data,
                        requestingUser:
                            req.user,
                    },
                );

            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "User status updated successfully",
                    data: user,
                });
        } catch (error) {
            next(error);
        }
    };

//update user role
export const updateUserRole =
    async (
        req,
        res,
        next,
    ) => {
        try {
            const { userId } =
                userIdSchema.parse(
                    req.params,
                );

            const { role } =
                updateUserRoleSchema.parse(
                    req.body,
                );

            const user =
                await updateUserRoleService(
                    {
                        userId,
                        role,
                        requestingUser:
                            req.user,
                    },
                );

            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "User role updated successfully",
                    data: user,
                });
        } catch (error) {
            next(error);
        }
    };