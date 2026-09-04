// src/modules/products/product.repository.js
import Product from "./product.model.js";

export const createProduct = async (
  productData,
) => {
  return Product.create(
    productData,
  );
};

export const findProductById = async (
  productId,
) => {
  return Product.findOne({
    _id: productId,
    isDeleted: false,
  }).lean();
};

export const findProducts = async ({
  filter,
  skip,
  limit,
  sort,
}) => {
  return Product.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countProducts = async (
  filter,
) => {
  return Product.countDocuments(
    filter,
  );
};

export const updateProductById =
  async (
    productId,
    updateData,
  ) => {
    return Product.findOneAndUpdate(
      {
        _id: productId,
        isDeleted: false,
      },
      {
        $set: updateData,
      },
      {
        returnDocument:
          "after",
        runValidators: true,
      },
    ).lean();
  };

export const softDeleteProductById =
  async (productId) => {
    return Product.findOneAndUpdate(
      {
        _id: productId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          isFeatured: false,
          featuredPriority: 0,
        },
      },
      {
        returnDocument:
          "after",
      },
    ).lean();
  };

export const updateProductReviewStats =
  async (
    productId,
    {
      averageRating,
      reviewCount,
    },
  ) => {
    return Product.findOneAndUpdate(
      {
        _id: productId,
        isDeleted: false,
      },
      {
        $set: {
          averageRating,
          reviewCount,
        },
      },
      {
        returnDocument:
          "after",
      },
    ).lean();
  };

export const updateProductFeaturedById =
  async (
    productId,
    isFeatured,
    featuredPriority = 0,
  ) => {
    return Product.findOneAndUpdate(
      {
        _id: productId,
        isDeleted: false,
      },
      {
        $set: {
          isFeatured,
          featuredPriority:
            isFeatured
              ? featuredPriority
              : 0,
        },
      },
      {
        returnDocument:
          "after",
        runValidators: true,
      },
    ).lean();
  };

export const incrementProductTracking =
  async (
    productId,
    field,
  ) => {
    return Product.findOneAndUpdate(
      {
        _id: productId,
        isDeleted: false,
      },
      {
        $inc: {
          [field]: 1,
        },
      },
      {
        returnDocument:
          "after",
      },
    ).lean();
  };

export const incrementProductPurchaseCount =
  async (
    productId,
    quantity = 1,
  ) => {
    return Product.findOneAndUpdate(
      {
        _id: productId,
        isDeleted: false,
      },
      {
        $inc: {
          purchaseCount:
            quantity,
        },
      },
      {
        returnDocument:
          "after",
      },
    ).lean();
  };

export const findBestSellingProducts =
  async ({
    filter,
    limit,
  }) => {
    return Product.find(filter)
      .sort({
        purchaseCount: -1,
        averageRating: -1,
        reviewCount: -1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  };

export const findTopRatedProducts =
  async ({
    filter,
    limit,
  }) => {
    return Product.find(filter)
      .sort({
        averageRating: -1,
        reviewCount: -1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  };

export const getTotalPurchaseCount =
  async (filter) => {
    const result =
      await Product.aggregate([
        {
          $match: filter,
        },
        {
          $group: {
            _id: null,
            totalPurchases: {
              $sum: "$purchaseCount",
            },
          },
        },
      ]);

    return (
      result[0]
        ?.totalPurchases || 0
    );
  };