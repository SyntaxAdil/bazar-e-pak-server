import Product from "./product.model.js";

export const createProduct = async (productData) => {
  return Product.create(productData);
};

export const findProductById = async (productId) => {
  return Product.findOne({
    _id: productId,
    isDeleted: false,
  }).lean();
};

export const findProducts = async ({
  filter,
  skip,
  limit,
}) => {
  return Product.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countProducts = async (filter) => {
  return Product.countDocuments(filter);
};

export const updateProductById = async (
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
      new: true,
      runValidators: true,
    },
  ).lean();
};

export const softDeleteProductById = async (
  productId,
) => {
  return Product.findOneAndUpdate(
    {
      _id: productId,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
      },
    },
    {
      new: true,
    },
  ).lean();
};

// Review-related product update
export const updateProductReviewStats = async (
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
      new: true,
    },
  ).lean();
};