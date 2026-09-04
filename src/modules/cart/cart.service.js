// src/modules/cart/cart.service.js
import mongoose from "mongoose";

import {
  findCartByUserId,
  findCartByUserIdRaw,
  createCart,
  saveCart,
  deleteCart,
} from "./cart.repository.js";

import { CART_MESSAGES } from "./cart.constants.js";

import Product from "../products/product.model.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

const getOrCreateCart = async (userId) => {
  let cart = await findCartByUserIdRaw(userId);

  if (!cart) {
    cart = await createCart(userId);
  }

  return cart;
};

//validate product
const validateProduct = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw createError(CART_MESSAGES.PRODUCT_NOT_FOUND, 404);
  }

  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
  });

  if (!product) {
    throw createError(CART_MESSAGES.PRODUCT_NOT_FOUND, 404);
  }

  if (product.status !== "active") {
    throw createError(CART_MESSAGES.PRODUCT_UNAVAILABLE, 400);
  }

  if (!product.shopId) {
    throw createError("Product shop information is missing", 400);
  }

  return product;
};

//get cart
export const getCartService = async (userId) => {
  let cart = await findCartByUserId(userId);

  if (!cart) {
    await createCart(userId);

    cart = await findCartByUserId(userId);
  }

  return cart;
};

//add item
export const addToCartService = async (userId, productId, quantity) => {
  const product = await validateProduct(productId);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw createError("Quantity must be at least 1", 400);
  }

  if (product.stock < quantity) {
    throw createError(CART_MESSAGES.INSUFFICIENT_STOCK, 409);
  }

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(
    (item) => item.product.toString() === String(productId),
  );

  const currentQuantity = existingItem ? existingItem.quantity : 0;

  const newQuantity = currentQuantity + quantity;

  if (product.stock < newQuantity) {
    throw createError(CART_MESSAGES.INSUFFICIENT_STOCK, 409);
  }

  const price = product.price * (1 - (product.discount || 0) / 100);

  if (existingItem) {
    existingItem.quantity = newQuantity;
    existingItem.shop = product.shopId;
    existingItem.price = price;
    existingItem.productName = product.name;
    existingItem.productImage = product.images?.[0] || null;
  } else {
    cart.items.push({
      product: product._id,
      shop: product.shopId,
      quantity,
      price,
      productName: product.name,
      productImage: product.images?.[0] || null,
    });
  }

  await saveCart(cart);

  return getCartService(userId);
};

//update item
export const updateCartItemService = async (userId, productId, quantity) => {
  const product = await validateProduct(productId);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw createError("Quantity must be at least 1", 400);
  }

  if (product.stock < quantity) {
    throw createError(CART_MESSAGES.INSUFFICIENT_STOCK, 409);
  }

  const cart = await getOrCreateCart(userId);

  const item = cart.items.find(
    (cartItem) => cartItem.product.toString() === String(productId),
  );

  if (!item) {
    throw createError(CART_MESSAGES.ITEM_NOT_FOUND, 404);
  }

  item.quantity = quantity;

  item.shop = product.shopId;

  item.price = product.price * (1 - (product.discount || 0) / 100);

  item.productName = product.name;

  item.productImage = product.images?.[0] || null;

  await saveCart(cart);

  return getCartService(userId);
};

//remove item
export const removeCartItemService = async (userId, productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw createError(CART_MESSAGES.ITEM_NOT_FOUND, 404);
  }

  const cart = await getOrCreateCart(userId);

  const itemExists = cart.items.some(
    (item) => item.product.toString() === String(productId),
  );

  if (!itemExists) {
    throw createError(CART_MESSAGES.ITEM_NOT_FOUND, 404);
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== String(productId),
  );

  await saveCart(cart);

  return getCartService(userId);
};

//clear cart
export const clearCartService = async (userId) => {
  await deleteCart(userId);

  return getCartService(userId);
};
