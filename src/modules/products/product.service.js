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

  const shop =
    await validateShop(
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
    discount:
      productData.discount ?? 0,
    isFeatured: false,
    purchaseCount: 0,
    whatsappClicks: 0,
    callClicks: 0,
    averageRating: 0,
    reviewCount: 0,
  });
};

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

/**
 * Public product listing.
 * Used by storefront / customer pages.
 */
export const listProducts = async (query) => {
  const {
    search,
    categoryId,
    shopId,
    status,
    isFeatured,
    sellerId,
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

  if (sellerId) {
    filter.sellerId = String(sellerId);
  }

  if (status) {
    filter.status = status;
  }

  if (isFeatured !== undefined) {
    filter.isFeatured = isFeatured === "true";
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
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
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Seller product listing.
 * IMPORTANT:
 * Seller can only see their own products.
 */
export const listSellerProducts = async (
  query,
  user,
) => {
  if (!user?.id) {
    throw createError(
      "Authenticated user information is required",
      401,
    );
  }

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
    const shop =
      await validateShop(
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

  delete updatePayload.isFeatured;
  delete updatePayload.purchaseCount;
  delete updatePayload.whatsappClicks;
  delete updatePayload.callClicks;
  delete updatePayload.averageRating;
  delete updatePayload.reviewCount;

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

export const updateProductFeatured =
  async (
    productId,
    isFeatured,
    user,
  ) => {
    if (!user?.id) {
      throw createError(
        "Authenticated user information is required",
        401,
      );
    }

    const product =
      await findProductById(productId);

    if (!product) {
      throw createError(
        "Product not found",
        404,
      );
    }

    if (
      user.role === "seller" &&
      String(product.sellerId) !==
        String(user.id)
    ) {
      throw createError(
        "You are not allowed to manage this product",
        403,
      );
    }

    if (
      isFeatured &&
      product.status !== "active"
    ) {
      throw createError(
        "Only active products can be featured",
        400,
      );
    }

    return updateProductFeaturedById(
      productId,
      isFeatured,
    );
  };

export const trackProductClick =
  async (
    productId,
    type,
  ) => {
    const product =
      await findProductById(productId);

    if (!product) {
      throw createError(
        "Product not found",
        404,
      );
    }

    const field =
      type === "whatsapp"
        ? "whatsappClicks"
        : "callClicks";

    return incrementProductTracking(
      productId,
      field,
    );
  };

export const incrementPurchaseCount =
  async (
    productId,
    quantity = 1,
  ) => {
    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      throw createError(
        "Purchase quantity must be at least 1",
        400,
      );
    }

    const product =
      await findProductById(productId);

    if (!product) {
      throw createError(
        "Product not found",
        404,
      );
    }

    return incrementProductPurchaseCount(
      productId,
      quantity,
    );
  };

export const getBestSellingProducts =
  async ({
    shopId,
    categoryId,
    limit = 10,
  }) => {
    const filter = {
      isDeleted: false,
      status: "active",
    };

    if (shopId) {
      filter.shopId = shopId;
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    const totalPurchases =
      await getTotalPurchaseCount(
        filter,
      );

    if (totalPurchases > 0) {
      return findBestSellingProducts({
        filter,
        limit,
      });
    }

    return findTopRatedProducts({
      filter,
      limit,
    });
  };

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