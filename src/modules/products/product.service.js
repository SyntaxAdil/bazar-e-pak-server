import {
  createProduct as createProductRepository,
  findProductById,
  findProducts,
  countProducts,
  updateProductById,
  softDeleteProductById,
  updateProductReviewStats,
} from "./product.repository.js";

import {
  findCategoryById,
} from "../category/category.repository.js";

import {
  findShopById,
} from "../shops/shop.repository.js";

const createError = (
  message,
  statusCode,
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Validate category
const validateCategory = async (
  categoryId,
) => {
  const category =
    await findCategoryById(categoryId);

  if (!category) {
    throw createError(
      "Category not found",
      404,
    );
  }

  if (category.status !== "active") {
    throw createError(
      "Category is inactive",
      400,
    );
  }

  return category;
};

// Validate shop
const validateShop = async (
  shopId,
) => {
  const shop =
    await findShopById(shopId);

  if (!shop) {
    throw createError(
      "Shop not found",
      404,
    );
  }

  if (shop.status !== "active") {
    throw createError(
      "Shop is not active",
      400,
    );
  }

  return shop;
};

// Validate seller owns shop
const validateSellerShopOwnership = (
  shop,
  sellerId,
) => {
  if (
    String(shop.sellerId) !==
    String(sellerId)
  ) {
    throw createError(
      "You are not allowed to use this shop",
      403,
    );
  }

  return shop;
};

// Create product
export const createProduct = async (
  productData,
  user,
) => {
  if (!user?.id) {
    throw createError(
      "Authenticated user information is required",
      401,
    );
  }

  await validateCategory(
    productData.categoryId,
  );

  const shop = await validateShop(
    productData.shopId,
  );

  if (user.role === "seller") {
    validateSellerShopOwnership(
      shop,
      user.id,
    );
  }

  const sellerId = String(
    shop.sellerId,
  );

  return createProductRepository({
    ...productData,
    sellerId,
    averageRating: 0,
    reviewCount: 0,
  });
};

// Get product
export const getProductById = async (
  productId,
) => {
  const product =
    await findProductById(productId);

  if (!product) {
    throw createError(
      "Product not found",
      404,
    );
  }

  return product;
};

// Get products
export const listProducts = async (
  query,
) => {
  const {
    search,
    categoryId,
    shopId,
    status,
    page,
    limit,
  } = query;

  const filter = {
    isDeleted: false,
  };

  if (search) {
    filter.$text = {
      $search: search,
    };
  }

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  if (shopId) {
    filter.shopId = shopId;
  }

  if (status) {
    filter.status = status;
  }

  const skip =
    (page - 1) * limit;

  const [products, total] =
    await Promise.all([
      findProducts({
        filter,
        skip,
        limit,
      }),

      countProducts(filter),
    ]);

  return {
    products,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit,
      ),
    },
  };
};

// Update product
export const updateProduct = async (
  productId,
  updateData,
  user,
) => {
  if (!user?.id) {
    throw createError(
      "Authenticated user information is required",
      401,
    );
  }

  const existingProduct =
    await findProductById(productId);

  if (!existingProduct) {
    throw createError(
      "Product not found",
      404,
    );
  }

  if (
    user.role === "seller" &&
    String(existingProduct.sellerId) !==
      String(user.id)
  ) {
    throw createError(
      "You are not allowed to update this product",
      403,
    );
  }

  if (updateData.categoryId) {
    await validateCategory(
      updateData.categoryId,
    );
  }

  const updatePayload = {
    ...updateData,
  };

  if (updateData.shopId) {
    const shop = await validateShop(
      updateData.shopId,
    );

    if (user.role === "seller") {
      validateSellerShopOwnership(
        shop,
        user.id,
      );
    }

    updatePayload.sellerId =
      String(shop.sellerId);
  }

  const product =
    await updateProductById(
      productId,
      updatePayload,
    );

  if (!product) {
    throw createError(
      "Product not found",
      404,
    );
  }

  return product;
};

// Delete product
export const deleteProduct = async (
  productId,
  user,
) => {
  if (!user?.id) {
    throw createError(
      "Authenticated user information is required",
      401,
    );
  }

  const existingProduct =
    await findProductById(productId);

  if (!existingProduct) {
    throw createError(
      "Product not found",
      404,
    );
  }

  if (
    user.role === "seller" &&
    String(existingProduct.sellerId) !==
      String(user.id)
  ) {
    throw createError(
      "You are not allowed to delete this product",
      403,
    );
  }

  const product =
    await softDeleteProductById(
      productId,
    );

  if (!product) {
    throw createError(
      "Product not found",
      404,
    );
  }

  return product;
};

// Update review statistics
export const updateProductReviewStatistics =
  async (
    productId,
    averageRating,
    reviewCount,
  ) => {
    return updateProductReviewStats(
      productId,
      {
        averageRating,
        reviewCount,
      },
    );
  };