import {
    createReview as createReviewRepository,
    deleteReviewById,
    findReviewById,
    findReviews,
    getProductReviewStats,
    getShopReviewStats,
} from "./review.repository.js";

import {
    findProductById,
    updateProductReviewStats,
} from "../products/product.repository.js";

import {
    findShopById,
    updateShopReviewStats,
} from "../shops/shop.repository.js";

const createError = (
    message,
    statusCode,
) => {
    const error = new Error(message);
    error.statusCode = statusCode;

    return error;
};

const updateProductRating = async (
    productId,
) => {
    const {
        averageRating,
        reviewCount,
    } = await getProductReviewStats(
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

const updateShopRating = async (
    shopId,
) => {
    const {
        rating,
        totalReviews,
    } = await getShopReviewStats(
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

export const createReviewData = async (
    reviewData,
    user,
) => {
    const userId =
        user?.id || user?.sub;

    if (!userId) {
        throw createError(
            "Authenticated user information is required",
            401,
        );
    }

    // Check product exists
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
    }

    // Check shop exists
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
    }

    // Create review
    const review =
        await createReviewRepository({
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

            userId: String(userId),

            userName:
                user?.name || "Customer",
        });

    // Update product rating
    if (
        review.reviewType ===
        "product"
    ) {
        await updateProductRating(
            review.productId,
        );
    }

    // Update shop rating
    if (
        review.reviewType ===
        "shop"
    ) {
        await updateShopRating(
            review.shopId,
        );
    }

    return review;
};

export const getReviewsData = async (
    query,
) => {
    const {
        reviewType,
        productId,
        shopId,
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

    return findReviews(filter);
};

export const getReviewByIdData =
    async (reviewId) => {
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

        return review;
    };

export const deleteReviewData =
    async (
        reviewId,
        user,
    ) => {
        const userId =
            user?.id || user?.sub;

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

        // Only review owner can delete
        if (
            String(review.userId) !==
            String(userId)
        ) {
            throw createError(
                "You are not allowed to delete this review",
                403,
            );
        }

        await deleteReviewById(
            reviewId,
        );

        // Recalculate product rating
        if (
            review.reviewType ===
            "product"
        ) {
            await updateProductRating(
                review.productId,
            );
        }

        // Recalculate shop rating
        if (
            review.reviewType ===
            "shop"
        ) {
            await updateShopRating(
                review.shopId,
            );
        }

        return true;
    };