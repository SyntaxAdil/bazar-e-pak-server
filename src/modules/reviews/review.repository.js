import mongoose from "mongoose";
import Review from "./review.model.js";

export const createReview = (
  reviewData,
) => {
  return Review.create(reviewData);
};

export const findReviews = (
  filter = {},
) => {
  return Review.find(filter)
    .sort({
      createdAt: -1,
    })
    .lean();
};

export const findReviewById = (
  reviewId,
) => {
  return Review.findById(
    reviewId,
  ).lean();
};

export const deleteReviewById = (
  reviewId,
) => {
  return Review.findByIdAndDelete(
    reviewId,
  ).lean();
};

// Product review statistics
export const getProductReviewStats =
  async (productId) => {
    const [stats] =
      await Review.aggregate([
        {
          $match: {
            reviewType: "product",
            productId:
              new mongoose.Types.ObjectId(
                productId,
              ),
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
        stats?.averageRating || 0,

      reviewCount:
        stats?.reviewCount || 0,
    };
  };

// Shop review statistics
export const getShopReviewStats =
  async (shopId) => {
    const [stats] =
      await Review.aggregate([
        {
          $match: {
            reviewType: "shop",
            shopId:
              new mongoose.Types.ObjectId(
                shopId,
              ),
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
        stats?.totalReviews || 0,
    };
  };