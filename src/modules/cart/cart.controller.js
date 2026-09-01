import {
  getCartService,
  addToCartService,
  updateCartItemService,
  removeCartItemService,
  clearCartService,
} from "./cart.service.js";

import {
  addToCartValidation,
  updateCartItemValidation,
  cartItemParamValidation,
} from "./cart.validation.js";

import { CART_MESSAGES } from "./cart.constants.js";

export const getCartController = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cart = await getCartService(userId);

    res.status(200).json({
      success: true,
      message: CART_MESSAGES.CART_FETCHED,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const addToCartController = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.id;

    const { productId, quantity } =
      addToCartValidation.parse(req.body);

    const cart = await addToCartService(
      userId,
      productId,
      quantity
    );

    res.status(200).json({
      success: true,
      message: CART_MESSAGES.ITEM_ADDED,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItemController = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.id;

    const { productId } =
      cartItemParamValidation.parse(req.params);

    const { quantity } =
      updateCartItemValidation.parse(req.body);

    const cart = await updateCartItemService(
      userId,
      productId,
      quantity
    );

    res.status(200).json({
      success: true,
      message: CART_MESSAGES.ITEM_UPDATED,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const removeCartItemController = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.id;

    const { productId } =
      cartItemParamValidation.parse(req.params);

    const cart = await removeCartItemService(
      userId,
      productId
    );

    res.status(200).json({
      success: true,
      message: CART_MESSAGES.ITEM_REMOVED,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const clearCartController = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.id;

    const cart = await clearCartService(userId);

    res.status(200).json({
      success: true,
      message: CART_MESSAGES.CART_CLEARED,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};