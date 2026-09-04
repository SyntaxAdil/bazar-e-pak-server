// src/modules/seller-applications/seller-application.service.js
import {
    createApplication,
    findApplicationByUserId,
    findApplicationById,
    findApplications,
    countApplications,
    updateApplication,
} from "./seller-application.repository.js";

import User from "../users/user.model.js";

const createError = (
    message,
    statusCode,
) => {
    const error = new Error(
        message,
    );

    error.statusCode =
        statusCode;

    return error;
};

//apply seller
export const applySeller =
    async (
        data,
        user,
    ) => {
        if (
            !user?.id
        ) {
            throw createError(
                "Authenticated user information is required",
                401,
            );
        }

        if (
            user.role !==
            "customer"
        ) {
            throw createError(
                "Only customers can apply to become sellers",
                403,
            );
        }

        const existing =
            await findApplicationByUserId(
                user.id,
            );

        if (
            existing &&
            existing.status ===
                "pending"
        ) {
            throw createError(
                "Your seller application is already pending",
                409,
            );
        }

        if (
            existing &&
            existing.status ===
                "approved"
        ) {
            throw createError(
                "You are already an approved seller",
                409,
            );
        }

        return createApplication({
            ...data,
            userId: String(
                user.id,
            ),
            status: "pending",
            submittedAt:
                new Date(),
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason:
                "",
        });
    };

//get application
export const getMyApplication =
    async (
        user,
    ) => {
        const application =
            await findApplicationByUserId(
                user.id,
            );

        return (
            application || null
        );
    };

//get applications
export const getSellerApplications =
    async (
        query,
    ) => {
        const {
            status,
            search,
            page,
            limit,
        } = query;

        const filter = {};

        if (status) {
            filter.status =
                status;
        }

        if (search) {
            filter.$or = [
                {
                    name: {
                        $regex:
                            search,
                        $options:
                            "i",
                    },
                },
                {
                    email: {
                        $regex:
                            search,
                        $options:
                            "i",
                    },
                },
                {
                    businessName: {
                        $regex:
                            search,
                        $options:
                            "i",
                    },
                },
            ];
        }

        const skip =
            (page - 1) *
            limit;

        const [
            applications,
            total,
        ] =
            await Promise.all([
                findApplications({
                    filter,
                    skip,
                    limit,
                }),

                countApplications(
                    filter,
                ),
            ]);

        return {
            applications,
            pagination: {
                page,
                limit,
                total,
                totalPages:
                    Math.ceil(
                        total /
                            limit,
                    ),
            },
        };
    };

//review application
export const reviewSellerApplication =
    async (
        id,
        data,
        user,
    ) => {
        if (
            user?.role !==
            "super_admin"
        ) {
            throw createError(
                "Only the Super Admin can review seller applications",
                403,
            );
        }

        const application =
            await findApplicationById(
                id,
            );

        if (!application) {
            throw createError(
                "Seller application not found",
                404,
            );
        }

        if (
            application.status !==
                "pending" &&
            data.status !==
                "suspended"
        ) {
            throw createError(
                "Only pending applications can be approved or rejected",
                409,
            );
        }

        const reviewed =
            await updateApplication(
                id,
                {
                    status:
                        data.status,
                    reviewedAt:
                        new Date(),
                    reviewedBy:
                        String(
                            user.id,
                        ),
                    rejectionReason:
                        data.rejectionReason ||
                        "",
                },
            );

        if (
            data.status ===
            "approved"
        ) {
            await User.updateOne(
                {
                    _id: application.userId,
                },
                {
                    $set: {
                        role: "seller",
                        status:
                            "active",
                        isBlocked:
                            false,
                    },
                },
            );
        }

        if (
            data.status ===
                "rejected" ||
            data.status ===
                "suspended"
        ) {
            await User.updateOne(
                {
                    _id: application.userId,
                },
                {
                    $set: {
                        isBlocked:
                            data.status ===
                            "suspended",
                    },
                },
            );
        }

        return reviewed;
    };