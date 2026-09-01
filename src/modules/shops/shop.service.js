import mongoose from "mongoose";

import {
  countShops,
  createShop,
  deleteShopById,
  findShopById,
  findShopBySellerId,
  findShopBySlug,
  findShopDocumentById,
  findShops,
  updateShopById,
} from "./shop.repository.js";

const createServiceError = (
  message,
  statusCode = 400,
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const generateUniqueSlug = async (name) => {
  const baseSlug = generateSlug(name);

  let slug = baseSlug;
  let counter = 1;

  while (await findShopBySlug(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
};

export const createShopService = async ({
  sellerId,
  shopData,
}) => {
  if (!mongoose.isValidObjectId(sellerId)) {
    throw createServiceError(
      "Invalid seller ID",
      400,
    );
  }

  // One seller can currently own one shop.
  const existingShop =
    await findShopBySellerId(sellerId);

  if (existingShop) {
    throw createServiceError(
      "You already have a shop",
      409,
    );
  }

  const slug = await generateUniqueSlug(
    shopData.name,
  );

  try {
    const shop = await createShop({
      ...shopData,
      sellerId,
      slug,
    });

    return shop;
  } catch (error) {
    if (error.code === 11000) {
      throw createServiceError(
        "Shop with this information already exists",
        409,
      );
    }

    throw error;
  }
};

export const listShopsService = async ({
  page = 1,
  limit = 20,
  search,
  status,
  sellerId,
}) => {
  const query = {};

  if (status) {
    query.status = status;
  }

  if (sellerId) {
    query.sellerId = sellerId;
  }

  if (search) {
    query.$text = {
      $search: search,
    };
  }

  const skip = (page - 1) * limit;

  const [shops, total] =
    await Promise.all([
      findShops({
        query,
        skip,
        limit,
      }),

      countShops(query),
    ]);

  return {
    shops,

    pagination: {
      page,
      limit,
      total,
      totalPages:
        Math.ceil(total / limit),
    },
  };
};

export const getShopByIdService = async (
  shopId,
) => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw createServiceError(
      "Invalid shop ID",
      400,
    );
  }

  const shop = await findShopById(shopId);

  if (!shop) {
    throw createServiceError(
      "Shop not found",
      404,
    );
  }

  return shop;
};

export const getShopBySlugService = async (
  slug,
) => {
  const shop = await findShopBySlug(slug);

  if (!shop) {
    throw createServiceError(
      "Shop not found",
      404,
    );
  }

  return shop;
};

export const updateShopService = async ({
  shopId,
  userId,
  role,
  updateData,
}) => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw createServiceError(
      "Invalid shop ID",
      400,
    );
  }

  const shop =
    await findShopDocumentById(shopId);

  if (!shop) {
    throw createServiceError(
      "Shop not found",
      404,
    );
  }

  // Seller can only update their own shop.
  if (
    role !== "admin" &&
    String(shop.sellerId) !==
      String(userId)
  ) {
    throw createServiceError(
      "You are not allowed to update this shop",
      403,
    );
  }

  const data = {
    ...updateData,
  };

  // Generate a new slug if shop name changes.
  if (
    data.name &&
    data.name !== shop.name
  ) {
    data.slug =
      await generateUniqueSlug(data.name);
  }

  return updateShopById(
    shopId,
    data,
  );
};

export const deleteShopService = async ({
  shopId,
  userId,
  role,
}) => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw createServiceError(
      "Invalid shop ID",
      400,
    );
  }

  const shop =
    await findShopDocumentById(shopId);

  if (!shop) {
    throw createServiceError(
      "Shop not found",
      404,
    );
  }

  // Seller can only delete their own shop.
  if (
    role !== "admin" &&
    String(shop.sellerId) !==
      String(userId)
  ) {
    throw createServiceError(
      "You are not allowed to delete this shop",
      403,
    );
  }

  await deleteShopById(shopId);

  return true;
};

export const updateShopStatusService =
  async ({
    shopId,
    status,
  }) => {
    if (!mongoose.isValidObjectId(shopId)) {
      throw createServiceError(
        "Invalid shop ID",
        400,
      );
    }

    const shop =
      await findShopDocumentById(shopId);

    if (!shop) {
      throw createServiceError(
        "Shop not found",
        404,
      );
    }

    return updateShopById(
      shopId,
      {
        status,
      },
    );
  };