import {
    createReviewSchema,
    reviewIdSchema,
    reviewQuerySchema,
} from "./review.validation.js";

import {
    createReviewData,
    deleteReviewData,
    getReviewByIdData,
    getReviewsData,
} from "./review.service.js";

export const createReview = async (
    req,
    res,
) => {
    const data =
        createReviewSchema.parse(
            req.body,
        );

    const review =
        await createReviewData(
            data,
            req.user,
        );

    return res.status(201).json({
        success: true,
        message:
            "Review created successfully",
        data: review,
    });
};

export const getReviews = async (
    req,
    res,
) => {
    const query =
        reviewQuerySchema.parse(
            req.query,
        );

    const reviews =
        await getReviewsData(query);

    return res.status(200).json({
        success: true,
        message:
            "Reviews fetched successfully",
        data: reviews,
    });
};

export const getReviewById = async (
    req,
    res,
) => {
    const { id } =
        reviewIdSchema.parse(
            req.params,
        );

    const review =
        await getReviewByIdData(id);

    return res.status(200).json({
        success: true,
        message:
            "Review fetched successfully",
        data: review,
    });
};

export const deleteReview = async (
    req,
    res,
) => {
    const { id } =
        reviewIdSchema.parse(
            req.params,
        );

    await deleteReviewData(
        id,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message:
            "Review deleted successfully",
        data: null,
    });
};