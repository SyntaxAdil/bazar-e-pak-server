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

// Update product rating cache
const updateProductRating = async (
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

// Update shop rating cache
const updateShopRating = async (
  shopId,
) => {
  const {
    rating,
    totalReviews,
  } =
    await getShopReviewStats(shopId);

  await updateShopReviewStats(
    shopId,
    {
      rating,
      totalReviews,
    },
  );
};

// Create review
export const createReviewData =
  async (
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

    /*
     * PRODUCT REVIEW
     */
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

      // Prevent duplicate product review
      const existingReviews =
        await findReviews({
          reviewType: "product",
          productId:
            reviewData.productId,
          userId: String(userId),
        });

      if (existingReviews.length > 0) {
        throw createError(
          "You have already reviewed this product",
          409,
        );
      }
    }

    /*
     * SHOP REVIEW
     */
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

      // Prevent duplicate shop review
      const existingReviews =
        await findReviews({
          reviewType: "shop",
          shopId:
            reviewData.shopId,
          userId: String(userId),
        });

      if (existingReviews.length > 0) {
        throw createError(
          "You have already reviewed this shop",
          409,
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

// Get reviews
export const getReviewsData =
  async (query) => {
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
      filter.shopId = shopId;
    }

    return findReviews(filter);
  };

// Get review by ID
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

// Delete review
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