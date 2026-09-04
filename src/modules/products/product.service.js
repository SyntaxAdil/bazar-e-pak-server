// src/modules/products/product.service.js
import {
  createProduct as createProductRepository,
  findProductById,
  findProducts,
  countProducts,
  updateProductById,
  softDeleteProductById,
  updateProductReviewStats,
  updateProductFeaturedById,
  incrementProductTracking,
  incrementProductPurchaseCount,
  findBestSellingProducts,
  findTopRatedProducts,
  getTotalPurchaseCount,
} from "./product.repository.js";

import { findCategoryById } from "../category/category.repository.js";

import { findShopById } from "../shops/shop.repository.js";
import { safeAudit } from "../../utils/audit.js";

const createError = (message, statusCode) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

const validateCategory = async (categoryId) => {
  const category = await findCategoryById(categoryId);

  if (!category) {
    throw createError("Category not found", 404);
  }

  if (category.status !== "active") {
    throw createError("Category is inactive", 400);
  }

  return category;
};

const validateShop = async (shopId) => {
  const shop = await findShopById(shopId);

  if (!shop) {
    throw createError("Shop not found", 404);
  }

  if (shop.status !== "active") {
    throw createError("Shop is not active", 400);
  }

  return shop;
};

const validateSellerShopOwnership = (shop, sellerId) => {
  if (String(shop.sellerId) !== String(sellerId)) {
    throw createError("You are not allowed to use this shop", 403);
  }

  return shop;
};

//create product
export const createProduct = async (productData, user) => {
  if (!user?.id) {
    throw createError("Authenticated user information is required", 401);
  }

  await validateCategory(productData.categoryId);

  const shop = await validateShop(productData.shopId);

  if (user.role === "seller") {
    validateSellerShopOwnership(shop, user.id);
  }

  const sellerId = String(shop.sellerId);

  const created = await createProductRepository({
    ...productData,
    sellerId,
    source: "seller",
    discount: productData.discount ?? 0,
    isFeatured: false,
    featuredPriority: 0,
    purchaseCount: 0,
    whatsappClicks: 0,
    callClicks: 0,
    averageRating: 0,
    reviewCount: 0,
  });
  await safeAudit({
    actor: user,
    action: "PRODUCT_CREATED",
    resourceType: "Product",
    resourceId: created._id,
    newState: created,
  });
  return created;
};

//get product
export const getProductById = async (productId) => {
  const product = await findProductById(productId);

  if (!product) {
    throw createError("Product not found", 404);
  }

  return product;
};

//list products
export const listProducts = async (query) => {
  const {
    search,
    categoryId,
    shopId,
    status,
    isFeatured,
    sellerId,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    sortBy,
    sortOrder,
    page,
    limit,
  } = query;

  const filter = {
    isDeleted: false,
    status: status || "active",
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

  if (sellerId) {
    filter.sellerId = String(sellerId);
  }

  if (isFeatured !== undefined) {
    filter.isFeatured = isFeatured === "true";
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};

    if (minPrice !== undefined) {
      filter.price.$gte = minPrice;
    }

    if (maxPrice !== undefined) {
      filter.price.$lte = maxPrice;
    }
  }

  if (minRating !== undefined) {
    filter.averageRating = {
      $gte: minRating,
    };
  }

  if (inStock === "true") {
    filter.stock = {
      $gt: 0,
    };
  }

  if (inStock === "false") {
    filter.stock = 0;
  }

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    findProducts({
      filter,
      skip,
      limit,
      sort,
    }),

    countProducts(filter),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

//get seller products
export const listSellerProducts = async (query, user) => {
  if (!user?.id) {
    throw createError("Authenticated user information is required", 401);
  }

  const { search, categoryId, shopId, status, sortBy, sortOrder, page, limit } =
    query;

  const filter = {
    isDeleted: false,
    sellerId: String(user.id),
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

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    findProducts({
      filter,
      skip,
      limit,
      sort,
    }),

    countProducts(filter),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

//update product
export const updateProduct = async (productId, updateData, user) => {
  if (!user?.id) {
    throw createError("Authenticated user information is required", 401);
  }

  const existingProduct = await findProductById(productId);

  if (!existingProduct) {
    throw createError("Product not found", 404);
  }

  if (
    user.role === "seller" &&
    String(existingProduct.sellerId) !== String(user.id)
  ) {
    throw createError("You are not allowed to update this product", 403);
  }

  if (updateData.categoryId) {
    await validateCategory(updateData.categoryId);
  }

  const updatePayload = {
    ...updateData,
  };

  if (updateData.shopId) {
    const shop = await validateShop(updateData.shopId);

    if (user.role === "seller") {
      validateSellerShopOwnership(shop, user.id);
    }

    updatePayload.sellerId = String(shop.sellerId);
  }

  delete updatePayload.isFeatured;
  delete updatePayload.featuredPriority;
  delete updatePayload.purchaseCount;
  delete updatePayload.whatsappClicks;
  delete updatePayload.callClicks;
  delete updatePayload.averageRating;
  delete updatePayload.reviewCount;
  delete updatePayload.source;
  delete updatePayload.sellerId;

  const product = await updateProductById(productId, updatePayload);

  if (!product) {
    throw createError("Product not found", 404);
  }

  await safeAudit({
    actor: user,
    action: "PRODUCT_UPDATED",
    resourceType: "Product",
    resourceId: productId,
    newState: product,
  });
  return product;
};

//delete product
export const deleteProduct = async (productId, user) => {
  if (!user?.id) {
    throw createError("Authenticated user information is required", 401);
  }

  const existingProduct = await findProductById(productId);

  if (!existingProduct) {
    throw createError("Product not found", 404);
  }

  if (
    user.role === "seller" &&
    String(existingProduct.sellerId) !== String(user.id)
  ) {
    throw createError("You are not allowed to delete this product", 403);
  }

  if (!["seller", "admin", "super_admin"].includes(user.role)) {
    throw createError("You are not allowed to delete this product", 403);
  }

  if (user.role === "admin" && !user.permissions?.includes("products.delete")) {
    throw createError("Product delete permission is required", 403);
  }

  const product = await softDeleteProductById(productId);

  if (!product) {
    throw createError("Product not found", 404);
  }

  await safeAudit({
    actor: user,
    action: "PRODUCT_DELETED",
    resourceType: "Product",
    resourceId: productId,
    previousState: existingProduct,
    newState: product,
  });
  return product;
};

//feature product
export const updateProductFeatured = async (
  productId,
  isFeatured,
  featuredPriority,
  user,
) => {
  if (user?.role !== "super_admin") {
    throw createError("Only the Super Admin can manage featured products", 403);
  }

  const product = await findProductById(productId);

  if (!product) {
    throw createError("Product not found", 404);
  }

  if (isFeatured && product.status !== "active") {
    throw createError("Only active products can be featured", 400);
  }

  const updated = await updateProductFeaturedById(
    productId,
    isFeatured,
    featuredPriority,
  );
  await safeAudit({
    actor: user,
    action: isFeatured ? "PRODUCT_FEATURED" : "PRODUCT_UNFEATURED",
    resourceType: "Product",
    resourceId: productId,
    previousState: product,
    newState: updated,
  });
  return updated;
};

//track product
export const trackProductClick = async (
  productId,
  type,
  user,
  metadata = {},
) => {
  const product = await findProductById(productId);

  if (!product) {
    throw createError("Product not found", 404);
  }

  const fieldMap = {
    whatsapp: "whatsappClicks",
    call: "callClicks",
  };
  const eventMap = {
    product_view: "PRODUCT_VIEW",
    product_click: "PRODUCT_CLICK",
    whatsapp: "WHATSAPP_CLICK",
    call: "CALL_CLICK",
    website: "WEBSITE_CLICK",
    location: "LOCATION_CLICK",
    youtube: "YOUTUBE_CLICK",
    social: "SOCIAL_CLICK",
    share: "SHARE",
    add_to_cart: "ADD_TO_CART",
  };

  const field = fieldMap[type];

  if (field) await incrementProductTracking(productId, field);
  const { trackAnalyticsEvent } =
    await import("../analytics/analytics.service.js");
  await trackAnalyticsEvent(
    { eventType: eventMap[type], productId, metadata: metadata || {} },
    user,
  );
  return product;
};

//increment purchase count
export const incrementPurchaseCount = async (productId, quantity = 1) => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw createError("Purchase quantity must be at least 1", 400);
  }

  const product = await findProductById(productId);

  if (!product) {
    throw createError("Product not found", 404);
  }

  return incrementProductPurchaseCount(productId, quantity);
};

//get best selling
export const getBestSellingProducts = async ({
  shopId,
  categoryId,
  limit = 10,
}) => {
  const filter = {
    isDeleted: false,
    status: "active",
    purchaseCount: { $gt: 0 },
  };
  if (shopId) filter.shopId = shopId;
  if (categoryId) filter.categoryId = categoryId;
  return findBestSellingProducts({ filter, limit });
};

//update review statistics
export const updateProductReviewStatistics = async (
  productId,
  averageRating,
  reviewCount,
) => {
  return updateProductReviewStats(productId, {
    averageRating,
    reviewCount,
  });
};
