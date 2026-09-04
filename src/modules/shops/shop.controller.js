import {
  createShopService,
  deleteShopService,
  getShopByIdService,
  getShopBySlugService,
  listShopsService,
  updateShopService,
  updateShopStatusService,
} from "./shop.service.js";

import {
  createShopSchema,
  shopIdSchema,
  shopListQuerySchema,
  shopSlugSchema,
  updateShopSchema,
  updateShopStatusSchema,
} from "./shop.validation.js";

export const createShop = async (req, res) => {
  const data = createShopSchema.parse(req.body);

  const shop = await createShopService({
    sellerId: req.user.id,
    shopData: data,
  });

  return res.status(201).json({
    success: true,
    message: "Shop created successfully",
    data: shop,
  });
};

export const getShops = async (req, res) => {
  const query = shopListQuerySchema.parse(req.query);

  const result = await listShopsService(query);

  return res.status(200).json({
    success: true,
    message: "Shops fetched successfully",
    data: result.shops,
    pagination: result.pagination,
  });
};

export const getShopById = async (req, res) => {
  const { shopId } = shopIdSchema.parse(req.params);

  const shop = await getShopByIdService(shopId);

  return res.status(200).json({
    success: true,
    message: "Shop fetched successfully",
    data: shop,
  });
};

export const getShopBySlug = async (req, res) => {
  const { slug } = shopSlugSchema.parse(req.params);

  const shop = await getShopBySlugService(slug);

  return res.status(200).json({
    success: true,
    message: "Shop fetched successfully",
    data: shop,
  });
};

export const updateShop = async (req, res) => {
  const { shopId } = shopIdSchema.parse(req.params);

  const data = updateShopSchema.parse(req.body);

  const shop = await updateShopService({
    shopId,
    userId: req.user.id,
    role: req.user.role,
    updateData: data,
  });

  return res.status(200).json({
    success: true,
    message: "Shop updated successfully",
    data: shop,
  });
};

export const deleteShop = async (req, res) => {
  const { shopId } = shopIdSchema.parse(req.params);

  await deleteShopService({
    shopId,
    userId: req.user.id,
    role: req.user.role,
  });

  return res.status(200).json({
    success: true,
    message: "Shop deleted successfully",
    data: null,
  });
};

export const updateShopStatus = async (req, res) => {
  const { shopId } = shopIdSchema.parse(req.params);

  const data = updateShopStatusSchema.parse(req.body);

  const shop = await updateShopStatusService({
    shopId,
    status: data.status,
  });

  return res.status(200).json({
    success: true,
    message: "Shop status updated successfully",
    data: shop,
  });
};
