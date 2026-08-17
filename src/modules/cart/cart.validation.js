import { z } from "zod";

export const addToCartValidation = z.object({
  productId: z
    .string()
    .min(1, "Product ID is required"),

  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1"),
});

export const updateCartItemValidation = z.object({
  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1"),
});

export const cartItemParamValidation = z.object({
  productId: z
    .string()
    .min(1, "Product ID is required"),
});