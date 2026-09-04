// src/modules/cart/cart.validation.js
import { z } from "zod";

const objectIdSchema = z
    .string()
    .regex(
        /^[0-9a-fA-F]{24}$/,
        "Invalid product ID",
    );

export const addToCartValidation =
    z.object({
        productId:
            objectIdSchema,

        quantity: z
            .number()
            .int()
            .min(
                1,
                "Quantity must be at least 1",
            )
            .max(
                1000,
                "Quantity cannot exceed 1000",
            ),
    });

export const updateCartItemValidation =
    z.object({
        quantity: z
            .number()
            .int()
            .min(
                1,
                "Quantity must be at least 1",
            )
            .max(
                1000,
                "Quantity cannot exceed 1000",
            ),
    });

export const cartItemParamValidation =
    z.object({
        productId:
            objectIdSchema,
    });