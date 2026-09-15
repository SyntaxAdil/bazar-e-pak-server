// src/modules/reviews/review.service.js

import {
    createReview as createReviewRepository,
    deleteReviewById,
    findReviewById,
    findReviews,
    countReviews,
    getProductReviewStats,
    getShopReviewStats,
    updateReviewStatus,
} from "./review.repository.js";

import {
    findProductById,
    updateProductReviewStats,
} from "../products/product.repository.js";

import {
    findShopById,
    updateShopReviewStats,
} from "../shops/shop.repository.js";

import {
    safeTrack,
} from "../../utils/analytics.js";

import {
    safeAudit,
} from "../../utils/audit.js";


const createError = (
    message,
    statusCode,
) => {
    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;
};


const updateProductRating =
    async (
        productId,
    ) => {
        const {
            averageRating,
            reviewCount,
        } =
            await getProductReviewStats(
                productId,
            );

        await updateProductReviewStats(
            productId,
            {
                averageRating,
                reviewCount,
            },
        );
    };


const updateShopRating =
    async (
        shopId,
    ) => {
        const {
            rating,
            totalReviews,
        } =
            await getShopReviewStats(
                shopId,
            );

        await updateShopReviewStats(
            shopId,
            {
                rating,
                totalReviews,
            },
        );
    };


// create review
export const createReviewData =
    async (
        reviewData,
        user,
    ) => {
        const userId =
            user?.id ||
            user?.sub;

        if (!userId) {
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
                "Only customers can create reviews",
                403,
            );
        }


        // Product review validation
        if (
            reviewData.reviewType ===
            "product"
        ) {
            const product =
                await findProductById(
                    reviewData.productId,
                );

            if (!product) {
                throw createError(
                    "Product not found",
                    404,
                );
            }

            const existing =
                await findReviews({
                    filter: {
                        reviewType:
                            "product",

                        productId:
                            reviewData.productId,

                        userId:
                            String(
                                userId,
                            ),
                    },

                    limit: 1,
                });

            if (
                existing.length
            ) {
                throw createError(
                    "You have already reviewed this product",
                    409,
                );
            }
        }


        // Shop review validation
        if (
            reviewData.reviewType ===
            "shop"
        ) {
            const shop =
                await findShopById(
                    reviewData.shopId,
                );

            if (!shop) {
                throw createError(
                    "Shop not found",
                    404,
                );
            }

            const existing =
                await findReviews({
                    filter: {
                        reviewType:
                            "shop",

                        shopId:
                            reviewData.shopId,

                        userId:
                            String(
                                userId,
                            ),
                    },

                    limit: 1,
                });

            if (
                existing.length
            ) {
                throw createError(
                    "You have already reviewed this shop",
                    409,
                );
            }
        }


        try {
            const review =
                await createReviewRepository(
                    {
                        ...reviewData,

                        productId:
                            reviewData.reviewType ===
                                "product"
                                ? reviewData.productId
                                : null,

                        shopId:
                            reviewData.reviewType ===
                                "shop"
                                ? reviewData.shopId
                                : null,

                        userId:
                            String(
                                userId,
                            ),

                        userName:
                            user?.name ||
                            "Customer",
                    },
                );


            if (
                review.reviewType ===
                "product"
            ) {
                await updateProductRating(
                    review.productId,
                );
            }


            if (
                review.reviewType ===
                "shop"
            ) {
                await updateShopRating(
                    review.shopId,
                );
            }


            safeTrack(
                {
                    eventType:
                        "REVIEW_CREATED",

                    productId:
                        review.productId ||
                        undefined,

                    shopId:
                        review.shopId ||
                        undefined,

                    metadata: {
                        reviewId:
                            String(
                                review._id,
                            ),
                    },
                },
                user,
            );


            return review;
        } catch (error) {
            if (
                error.code ===
                11000
            ) {
                throw createError(
                    "You have already reviewed this item",
                    409,
                );
            }

            throw error;
        }
    };


// PUBLIC REVIEWS
// Anyone can see published reviews only
export const getReviewsData =
    async (
        query,
    ) => {
        const {
            reviewType,
            productId,
            shopId,
            rating,
            page,
            limit,
            sortOrder,
        } = query;

        const filter = {
            status:
                "published",
        };


        if (reviewType) {
            filter.reviewType =
                reviewType;
        }


        if (productId) {
            filter.productId =
                productId;
        }


        if (shopId) {
            filter.shopId =
                shopId;
        }


        if (rating) {
            filter.rating =
                rating;
        }


        const skip =
            (page - 1) *
            limit;


        const sort = {
            createdAt:
                sortOrder ===
                    "asc"
                    ? 1
                    : -1,
        };


        const [
            reviews,
            total,
        ] =
            await Promise.all([
                findReviews({
                    filter,
                    skip,
                    limit,
                    sort,
                }),

                countReviews(
                    filter,
                ),
            ]);


        return {
            reviews,

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


// ADMIN / SUPER ADMIN DASHBOARD REVIEWS
export const getManagedReviewsData =
    async (
        query,
        user,
    ) => {
        const isSuperAdmin =
            user?.role ===
            "super_admin";


        const canViewAsAdmin =
            user?.role ===
            "admin" &&
            user.permissions?.includes(
                "reviews.view",
            );


        if (
            !isSuperAdmin &&
            !canViewAsAdmin
        ) {
            throw createError(
                "You are not allowed to view reviews",
                403,
            );
        }


        const {
            reviewType,
            productId,
            shopId,
            rating,
            status,
            page,
            limit,
            sortOrder,
        } = query;


        const filter = {};


        if (reviewType) {
            filter.reviewType =
                reviewType;
        }


        if (productId) {
            filter.productId =
                productId;
        }


        if (shopId) {
            filter.shopId =
                shopId;
        }


        if (rating) {
            filter.rating =
                rating;
        }


        if (status) {
            filter.status =
                status;
        }


        const skip =
            (page - 1) *
            limit;


        const sort = {
            createdAt:
                sortOrder ===
                    "asc"
                    ? 1
                    : -1,
        };


        const [
            reviews,
            total,
        ] =
            await Promise.all([
                findReviews({
                    filter,
                    skip,
                    limit,
                    sort,
                }),

                countReviews(
                    filter,
                ),
            ]);


        return {
            reviews,

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


// get single review
export const getReviewByIdData =
    async (
        reviewId,
        user,
    ) => {
        const review =
            await findReviewById(
                reviewId,
            );


        if (!review) {
            throw createError(
                "Review not found",
                404,
            );
        }


        if (
            review.status !==
            "published" &&
            ![
                "admin",
                "super_admin",
            ].includes(
                user?.role,
            )
        ) {
            throw createError(
                "Review not found",
                404,
            );
        }


        return review;
    };


// delete / remove review
export const deleteReviewData =
    async (
        reviewId,
        user,
    ) => {
        const userId =
            user?.id ||
            user?.sub;


        if (!userId) {
            throw createError(
                "Authenticated user information is required",
                401,
            );
        }


        const review =
            await findReviewById(
                reviewId,
            );


        if (!review) {
            throw createError(
                "Review not found",
                404,
            );
        }


        const isOwner =
            String(
                review.userId,
            ) ===
            String(
                userId,
            );


        const canModerate =
            user.role ===
            "super_admin" ||
            (
                user.role ===
                "admin" &&
                user.permissions?.includes(
                    "reviews.moderate",
                )
            );


        if (
            !isOwner &&
            !canModerate
        ) {
            throw createError(
                "You are not allowed to delete this review",
                403,
            );
        }


        await deleteReviewById(
            reviewId,
        );


        if (
            review.reviewType ===
            "product"
        ) {
            await updateProductRating(
                review.productId,
            );
        }


        if (
            review.reviewType ===
            "shop"
        ) {
            await updateShopRating(
                review.shopId,
            );
        }


        await safeAudit({
            actor:
                user,

            action:
                "REVIEW_REMOVED",

            resourceType:
                "Review",

            resourceId:
                reviewId,

            previousState:
                review,

            newState: {
                status:
                    "removed",
            },
        });


        return true;
    };


// moderate review
export const moderateReviewData =
    async (
        reviewId,
        status,
        reason,
        user,
    ) => {
        const canModerate =
            user?.role ===
            "super_admin" ||
            (
                user?.role ===
                "admin" &&
                user.permissions?.includes(
                    "reviews.moderate",
                )
            );


        if (!canModerate) {
            throw createError(
                "You are not allowed to moderate reviews",
                403,
            );
        }


        const review =
            await findReviewById(
                reviewId,
            );


        if (!review) {
            throw createError(
                "Review not found",
                404,
            );
        }


        const updated =
            await updateReviewStatus(
                reviewId,
                {
                    status,

                    moderatedBy:
                        String(
                            user.id,
                        ),

                    moderatedAt:
                        new Date(),

                    moderationReason:
                        reason || "",
                },
            );


        if (
            review.reviewType ===
            "product"
        ) {
            await updateProductRating(
                review.productId,
            );
        }


        if (
            review.reviewType ===
            "shop"
        ) {
            await updateShopRating(
                review.shopId,
            );
        }


        await safeAudit({
            actor:
                user,

            action:
                "REVIEW_MODERATED",

            resourceType:
                "Review",

            resourceId:
                reviewId,

            previousState:
                review,

            newState:
                updated,

            reason:
                reason || "",
        });


        return updated;
    };