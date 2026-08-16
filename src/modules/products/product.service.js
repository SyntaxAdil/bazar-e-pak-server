import {
  createProduct as createProductRepository,
  findProductById,
  findProducts,
  countProducts,
  updateProductById,
  softDeleteProductById,
} from "./product.repository.js";

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const createProduct = async (productData, user) => {
  if (!user?.id) {
    throw createError("Authenticated user information is required", 401);
  }

  const product = await createProductRepository({
    ...productData,

    // Never trust sellerId from the frontend.
    sellerId: user.id,
  });

  return product;
};

export const getProductById = async (productId) => {
  const product = await findProductById(productId);

  if (!product) {
    throw createError("Product not found", 404);
  }

  return product;
};

export const listProducts = async (query) => {
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

export const updateProduct = async (
  productId,
  updateData,
  user,
) => {
  const existingProduct = await findProductById(productId);

  if (!existingProduct) {
    throw createError("Product not found", 404);
  }

  // Ownership/role enforcement can be expanded here
  // when the final seller/shop permission rules are finalized.
  if (
    user?.role === "seller" &&
    existingProduct.sellerId !== user.id
  ) {
    throw createError(
      "You are not allowed to update this product",
      403,
    );
  }

  const product = await updateProductById(
    productId,
    updateData,
  );

  if (!product) {
    throw createError("Product not found", 404);
  }

  return product;
};

export const deleteProduct = async (
  productId,
  user,
) => {
  const existingProduct = await findProductById(productId);

  if (!existingProduct) {
    throw createError("Product not found", 404);
  }

  if (
    user?.role === "seller" &&
    existingProduct.sellerId !== user.id
  ) {
    throw createError(
      "You are not allowed to delete this product",
      403,
    );
  }

  const product =
    await softDeleteProductById(productId);

  if (!product) {
    throw createError("Product not found", 404);
  }

  return product;
};