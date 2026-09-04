import {
    countUsers,
    findUserById,
    findUsers,
    updateUserRole,
    updateUserStatus,
} from "./user.repository.js";

const createError = (
    message,
    statusCode,
) => {
    const error = new Error(message);

    error.statusCode = statusCode;

    return error;
};

//get users
export const getAllUsers = async (
    query,
    requestingUser,
) => {
    if (!requestingUser?.id) {
        throw createError(
            "Authenticated user information is required",
            401,
        );
    }

    const {
        search,
        role,
        status,
        isBlocked,
        page,
        limit,
        sortBy,
        sortOrder,
    } = query;

    const filter = {};

    if (search) {
        filter.$or = [
            {
                name: {
                    $regex: search,
                    $options: "i",
                },
            },
            {
                email: {
                    $regex: search,
                    $options: "i",
                },
            },
        ];
    }

    if (role) {
        filter.role = role;
    }

    if (status) {
        filter.status = status;
    }

    if (isBlocked !== undefined) {
        filter.isBlocked =
            isBlocked === "true";
    }

    const sort = {
        [sortBy]:
            sortOrder === "asc"
                ? 1
                : -1,
    };

    const skip = (page - 1) * limit;

    const [users, total] =
        await Promise.all([
            findUsers({
                filter,
                skip,
                limit,
                sort,
            }),

            countUsers(filter),
        ]);

    return {
        users,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(
                total / limit,
            ),
        },
    };
};

//update user status
export const updateUserStatusService =
    async ({
        userId,
        status,
        isBlocked,
        requestingUser,
    }) => {
        if (!requestingUser?.id) {
            throw createError(
                "Authenticated user information is required",
                401,
            );
        }

        const targetUser =
            await findUserById(userId);

        if (!targetUser) {
            throw createError(
                "User not found",
                404,
            );
        }

        if (
            String(targetUser._id) ===
            String(requestingUser.id)
        ) {
            throw createError(
                "You cannot change your own status",
                403,
            );
        }

        if (
            targetUser.role ===
            "super_admin"
        ) {
            throw createError(
                "The Super Admin account cannot be suspended or banned",
                403,
            );
        }

        if (
            targetUser.role === "admin" &&
            requestingUser.role !==
            "super_admin"
        ) {
            throw createError(
                "Only the Super Admin can manage admin accounts",
                403,
            );
        }

        const updateData = {};

        if (status !== undefined) {
            updateData.status = status;
        }

        if (isBlocked !== undefined) {
            updateData.isBlocked =
                isBlocked;
        }

        if (
            updateData.status ===
            "active" &&
            isBlocked === undefined
        ) {
            updateData.isBlocked = false;
        }

        return updateUserStatus(
            userId,
            updateData,
        );
    };

//change user role
export const updateUserRoleService =
    async ({
        userId,
        role,
        requestingUser,
    }) => {
        if (
            requestingUser?.role !==
            "super_admin"
        ) {
            throw createError(
                "Only the Super Admin can manage user roles",
                403,
            );
        }

        if (
            String(userId) ===
            String(requestingUser.id)
        ) {
            throw createError(
                "The Super Admin role cannot be changed",
                403,
            );
        }

        const targetUser =
            await findUserById(userId);

        if (!targetUser) {
            throw createError(
                "User not found",
                404,
            );
        }

        if (
            targetUser.role ===
            "super_admin" ||
            role === "super_admin"
        ) {
            throw createError(
                "The Super Admin role is protected",
                403,
            );
        }

        return updateUserRole(
            userId,
            role,
        );
    };