import { Cart } from "./cart.model.js";

export const findCartByUserId = async (userId) => {
  return Cart.findOne({ user: userId })
    .populate({
      path: "items.product",
      select:
        "name slug price discountPrice stock images status shop category",
    })
    .populate({
      path: "items.shop",
      select: "name slug",
    });
};

export const findCartByUserIdRaw = async (userId) => {
  return Cart.findOne({ user: userId });
};

export const createCart = async (userId) => {
  return Cart.create({
    user: userId,
    items: [],
  });
};

export const saveCart = async (cart) => {
  return cart.save();
};

export const deleteCart = async (userId) => {
  return Cart.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        items: [],
        totalItems: 0,
        subtotal: 0,
      },
    },
    {
      returnDocument: "after",
    }
  );
};