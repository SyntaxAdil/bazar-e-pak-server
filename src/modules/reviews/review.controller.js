// src/modules/reviews/review.controller.js
import {
    createReviewSchema,
    reviewIdSchema,
    reviewQuerySchema,
    moderateReviewSchema,
} from "./review.validation.js";

import {
    createReviewData,
    deleteReviewData,
    getReviewByIdData,
    getReviewsData,
    moderateReviewData,
} from "./review.service.js";

//create review
export const createReview = async (
    req,
    res,
    next,
) => {
    try {
        const data =
            createReviewSchema.parse(
                req.body,
            );

        const review =
            await createReviewData(
                data,
                req.user,
            );

        return res
            .status(201)
            .json({
                success: true,
                message:
                    "Review created successfully",
                data: review,
            });
    } catch (error) {
        next(error);
    }
};

//get reviews
export const getReviews = async (
    req,
    res,
    next,
) => {
    try {
        const query =
            reviewQuerySchema.parse(
                req.query,
            );

        const result =
            await getReviewsData(
                query,
                req.user,
            );

        return res
            .status(200)
            .json({
                success: true,
                message:
                    "Reviews fetched successfully",
                data: result.reviews,
                pagination:
                    result.pagination,
            });
    } catch (error) {
        next(error);
    }
};

//get review
export const getReviewById = async (
    req,
    res,
    next,
) => {
    try {
        const { id } =
            reviewIdSchema.parse(
                req.params,
            );

        const review =
            await getReviewByIdData(
                id,
                req.user,
            );

        return res
            .status(200)
            .json({
                success: true,
                message:
                    "Review fetched successfully",
                data: review,
            });
    } catch (error) {
        next(error);
    }
};

//delete review
export const deleteReview = async (
    req,
    res,
    next,
) => {
    try {
        const { id } =
            reviewIdSchema.parse(
                req.params,
            );

        await deleteReviewData(
            id,
            req.user,
        );

        return res
            .status(200)
            .json({
                success: true,
                message:
                    "Review deleted successfully",
                data: null,
            });
    } catch (error) {
        next(error);
    }
};

//moderate review
export const moderateReview =
    async (
        req,
        res,
        next,
    ) => {
        try {
            const { id } =
                reviewIdSchema.parse(
                    req.params,
                );

            const {
                status,
                reason,
            } =
                moderateReviewSchema.parse(
                    req.body,
                );

            const review =
                await moderateReviewData(
                    id,
                    status,
                    reason,
                    req.user,
                );

            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "Review moderation updated successfully",
                    data: review,
                });
        } catch (error) {
            next(error);
        }
    };