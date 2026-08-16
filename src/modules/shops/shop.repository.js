import Shop from "./shop.model.js";

export const createShop = (shopData) => {
  return Shop.create(shopData);
};

export const findShopById = (shopId) => {
  return Shop.findById(shopId).lean();
};

export const findShopDocumentById = (shopId) => {
  return Shop.findById(shopId);
};

export const findShopBySlug = (slug) => {
  return Shop.findOne({ slug }).lean();
};

export const findShopBySellerId = (sellerId) => {
  return Shop.findOne({
    sellerId,
  }).lean();
};

export const findShopDocumentBySellerId = (
  sellerId,
) => {
  return Shop.findOne({
    sellerId,
  });
};

export const updateShopById = (
  shopId,
  updateData,
) => {
  return Shop.findByIdAndUpdate(
    shopId,
    {
      $set: updateData,
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

export const deleteShopById = (shopId) => {
  return Shop.findByIdAndDelete(shopId);
};

export const findShops = ({
  query,
  skip,
  limit,
}) => {
  return Shop.find(query)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countShops = (query) => {
  return Shop.countDocuments(query);
};