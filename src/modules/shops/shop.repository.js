// src/modules/shops/shop.repository.js
import Shop from "./shop.model.js";

export const createShop = (shopData) => {
  return Shop.create(shopData);
};

export const findShopById = (shopId) => {
  return Shop.findOne({
    _id: shopId,
    isDeleted: false,
  }).lean();
};

export const findShopDocumentById = (shopId) => {
  return Shop.findOne({
    _id: shopId,
    isDeleted: false,
  });
};

export const findShopBySlug = (slug) => {
  return Shop.findOne({
    slug,
    isDeleted: false,
  }).lean();
};

export const findShopBySellerId = (sellerId) => {
  return Shop.findOne({
    sellerId,
    isDeleted: false,
  }).lean();
};

export const findShopDocumentBySellerId = (sellerId) => {
  return Shop.findOne({
    sellerId,
    isDeleted: false,
  });
};

export const updateShopById = (shopId, updateData) => {
  return Shop.findOneAndUpdate(
    {
      _id: shopId,
      isDeleted: false,
    },
    {
      $set: updateData,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).lean();
};

export const softDeleteShopById = (shopId) => {
  return Shop.findOneAndUpdate(
    {
      _id: shopId,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        status: "inactive",
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();
};

export const findShops = ({ query, skip, limit, sort }) => {
  return Shop.find(query).sort(sort).skip(skip).limit(limit).lean();
};

export const countShops = (query) => {
  return Shop.countDocuments(query);
};

export const updateShopReviewStats = (shopId, { rating, totalReviews }) => {
  return Shop.findOneAndUpdate(
    {
      _id: shopId,
      isDeleted: false,
    },
    {
      $set: {
        rating,
        totalReviews,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).lean();
};
