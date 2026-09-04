// src/modules/shops/shop.service.js
import mongoose from "mongoose";

import {
  countShops,
  createShop,
  softDeleteShopById,
  findShopById,
  findShopBySellerId,
  findShopBySlug,
  findShopDocumentById,
  findShops,
  updateShopById,
} from "./shop.repository.js";
import { safeAudit } from "../../utils/audit.js";

const createServiceError = (message, statusCode = 400) => {
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

//create shop
export const createShopService = async ({ sellerId, shopData }) => {
  if (!mongoose.isValidObjectId(sellerId)) {
    throw createServiceError("Invalid seller ID", 400);
  }

  const existingShop = await findShopBySellerId(sellerId);

  if (existingShop) {
    throw createServiceError("You already have a shop", 409);
  }

  const slug = await generateUniqueSlug(shopData.name);

  try {
    const created = await createShop({
      ...shopData,
      sellerId,
      status: "pending",
    });
    await safeAudit({
      actor: { id: String(sellerId), role: "seller" },
      action: "SHOP_CREATED",
      resourceType: "Shop",
      resourceId: created._id,
      newState: created,
    });
    return created;
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

//list shops
export const listShopsService = async ({
  page = 1,
  limit = 20,
  search,
  status,
  sellerId,
  city,
  minRating,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const query = {
    isDeleted: false,
  };

  if (status) {
    query.status = status;
  } else {
    query.status = "active";
  }

  if (sellerId) {
    query.sellerId = sellerId;
  }

  if (city) {
    query.city = {
      $regex: city,
      $options: "i",
    };
  }

  if (minRating !== undefined) {
    query.rating = {
      $gte: minRating,
    };
  }

  if (search) {
    query.$text = {
      $search: search,
    };
  }

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const skip = (page - 1) * limit;

  const [shops, total] = await Promise.all([
    findShops({
      query,
      skip,
      limit,
      sort,
    }),

    countShops(query),
  ]);

  return {
    shops,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

//get shop
export const getShopByIdService = async (shopId) => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw createServiceError("Invalid shop ID", 400);
  }

  const shop = await findShopById(shopId);

  if (!shop) {
    throw createServiceError("Shop not found", 404);
  }

  return shop;
};

//get shop by slug
export const getShopBySlugService = async (slug) => {
  const shop = await findShopBySlug(slug);

  if (!shop) {
    throw createServiceError("Shop not found", 404);
  }

  return shop;
};

//update shop
export const updateShopService = async ({
  shopId,
  userId,
  role,
  updateData,
}) => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw createServiceError("Invalid shop ID", 400);
  }

  const shop = await findShopDocumentById(shopId);

  if (!shop) {
    throw createServiceError("Shop not found", 404);
  }

  if (role !== "super_admin" && String(shop.sellerId) !== String(userId)) {
    throw createServiceError("You are not allowed to update this shop", 403);
  }

  const data = {
    ...updateData,
  };

  if (data.name && data.name !== shop.name) {
    data.slug = await generateUniqueSlug(data.name);
  }

  delete data.status;
  delete data.sellerId;
  delete data.rating;
  delete data.totalReviews;
  delete data.isDeleted;

  const updated = await updateShopById(shopId, data);
  await safeAudit({
    actor: { id: String(userId), role },
    action: "SHOP_UPDATED",
    resourceType: "Shop",
    resourceId: shopId,
    newState: updated,
  });
  return updated;
};

//delete shop
export const deleteShopService = async ({ shopId, userId, role }) => {
  const shop = await findShopDocumentById(shopId);

  if (!shop) {
    throw createServiceError("Shop not found", 404);
  }

  if (role !== "super_admin" && String(shop.sellerId) !== String(userId)) {
    throw createServiceError("You are not allowed to delete this shop", 403);
  }

  const deleted = await softDeleteShopById(shopId);
  await safeAudit({
    actor: { id: String(userId), role },
    action: "SHOP_DELETED",
    resourceType: "Shop",
    resourceId: shopId,
    newState: deleted,
  });
  return deleted;
};

//update shop status
export const updateShopStatusService = async ({ shopId, status }) => {
  const shop = await findShopDocumentById(shopId);

  if (!shop) {
    throw createServiceError("Shop not found", 404);
  }

  const updated = await updateShopById(shopId, { status });
  await safeAudit({
    actor: { id: String(shop.sellerId), role: "super_admin" },
    action: "SHOP_STATUS_CHANGED",
    resourceType: "Shop",
    resourceId: shopId,
    newState: { status },
  });
  return updated;
};
