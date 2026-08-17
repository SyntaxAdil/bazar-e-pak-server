import mongoose from "mongoose";

import {
  findCartByUserId,
  findCartByUserIdRaw,
  createCart,
  saveCart,
  deleteCart,
} from "./cart.repository.js";

import { Product } from "../products/product.model.js";
import { CART_MESSAGES } from "./cart.constants.js";

const getOrCreateCart = async (userId) => {
  let cart = await findCartByUserIdRaw(userId);

  if (!cart) {
    cart = await createCart(userId);
  }

  return cart;
};

const validateProduct = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error(CART_MESSAGES.PRODUCT_NOT_FOUND);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new Error(CART_MESSAGES.PRODUCT_NOT_FOUND);
  }

  if (product.status && product.status !== "active") {
    throw new Error(CART_MESSAGES.PRODUCT_UNAVAILABLE);
  }

  return product;
};

export const getCartService = async (userId) => {
  let cart = await findCartByUserId(userId);

  if (!cart) {
    await createCart(userId);
    cart = await findCartByUserId(userId);
  }

  return cart;
};

export const addToCartService = async (
  userId,
  productId,
  quantity
) => {
  const product = await validateProduct(productId);

  if (product.stock < quantity) {
    throw new Error(CART_MESSAGES.INSUFFICIENT_STOCK);
  }

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  const currentQuantity = existingItem
    ? existingItem.quantity
    : 0;

  const newQuantity = currentQuantity + quantity;

  if (product.stock < newQuantity) {
    throw new Error(CART_MESSAGES.INSUFFICIENT_STOCK);
  }

  const price =
    product.discountPrice ?? product.price;

  if (existingItem) {
    existingItem.quantity = newQuantity;
    existingItem.price = price;
    existingItem.productName = product.name;
    existingItem.productImage =
      product.images?.[0] ?? null;
  } else {
    cart.items.push({
      product: product._id,
      shop: product.shop,
      quantity,
      price,
      productName: product.name,
      productImage: product.images?.[0] ?? null,
    });
  }

  await saveCart(cart);

  return getCartService(userId);
};

export const updateCartItemService = async (
  userId,
  productId,
  quantity
) => {
  const product = await validateProduct(productId);

  if (product.stock < quantity) {
    throw new Error(CART_MESSAGES.INSUFFICIENT_STOCK);
  }

  const cart = await getOrCreateCart(userId);

  const item = cart.items.find(
    (cartItem) =>
      cartItem.product.toString() === productId
  );

  if (!item) {
    throw new Error(CART_MESSAGES.ITEM_NOT_FOUND);
  }

  item.quantity = quantity;

  item.price =
    product.discountPrice ?? product.price;

  item.productName = product.name;
  item.productImage =
    product.images?.[0] ?? null;

  await saveCart(cart);

  return getCartService(userId);
};

export const removeCartItemService = async (
  userId,
  productId
) => {
  const cart = await getOrCreateCart(userId);

  const itemExists = cart.items.some(
    (item) =>
      item.product.toString() === productId
  );

  if (!itemExists) {
    throw new Error(CART_MESSAGES.ITEM_NOT_FOUND);
  }

  cart.items = cart.items.filter(
    (item) =>
      item.product.toString() !== productId
  );

  await saveCart(cart);

  return getCartService(userId);
};

export const clearCartService = async (userId) => {
  return deleteCart(userId);
};