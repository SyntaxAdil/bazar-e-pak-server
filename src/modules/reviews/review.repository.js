// src/modules/reviews/review.repository.js
import mongoose from "mongoose";
import Review from "./review.model.js";

export const createReview = (
    reviewData,
) => {
    return Review.create(
        reviewData,
    );
};

export const findReviews = ({
    filter = {},
    skip = 0,
    limit = 20,
    sort = {
        createdAt: -1,
    },
}) => {
    return Review.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
};

export const countReviews = (
    filter = {},
) => {
    return Review.countDocuments(
        filter,
    );
};

export const findReviewById = (
    reviewId,
) => {
    return Review.findOne({
        _id: reviewId,
    }).lean();
};

export const deleteReviewById = (
    reviewId,
) => {
    return Review.findOneAndUpdate(
        {
            _id: reviewId,
        },
        {
            $set: {
                status: "removed",
            },
        },
        {
            returnDocument:
                "after",
        },
    ).lean();
};

export const hardDeleteReviewById = (
    reviewId,
) => {
    return Review.findByIdAndDelete(
        reviewId,
    ).lean();
};

export const updateReviewStatus = (
    reviewId,
    data,
) => {
    return Review.findOneAndUpdate(
        {
            _id: reviewId,
        },
        {
            $set: data,
        },
        {
            returnDocument:
                "after",
        },
    ).lean();
};

export const getProductReviewStats =
    async (
        productId,
    ) => {
        const [
            stats,
        ] = await Review.aggregate([
            {
                $match: {
                    reviewType:
                        "product",
                    productId:
                        new mongoose.Types.ObjectId(
                            productId,
                        ),
                    status:
                        "published",
                },
            },
            {
                $group: {
                    _id: null,
                    averageRating: {
                        $avg: "$rating",
                    },
                    reviewCount: {
                        $sum: 1,
                    },
                },
            },
        ]);

        return {
            averageRating:
                stats?.averageRating ||
                0,
            reviewCount:
                stats?.reviewCount ||
                0,
        };
    };

export const getShopReviewStats =
    async (
        shopId,
    ) => {
        const [
            stats,
        ] = await Review.aggregate([
            {
                $match: {
                    reviewType:
                        "shop",
                    shopId:
                        new mongoose.Types.ObjectId(
                            shopId,
                        ),
                    status:
                        "published",
                },
            },
            {
                $group: {
                    _id: null,
                    rating: {
                        $avg: "$rating",
                    },
                    totalReviews: {
                        $sum: 1,
                    },
                },
            },
        ]);

        return {
            rating:
                stats?.rating || 0,
            totalReviews:
                stats?.totalReviews ||
                0,
        };
    };