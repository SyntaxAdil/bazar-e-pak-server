import { z } from "zod";

const objectIdSchema = z
    .string()
    .regex(
        /^[0-9a-fA-F]{24}$/,
        "Invalid MongoDB ObjectId",
    );

export const createReviewSchema =
    z
        .object({
            reviewType: z.enum([
                "product",
                "shop",
            ]),

            productId:
                objectIdSchema
                    .optional()
                    .nullable(),

            shopId:
                objectIdSchema
                    .optional()
                    .nullable(),

            rating: z
                .number()
                .int()
                .min(
                    1,
                    "Rating must be at least 1",
                )
                .max(
                    5,
                    "Rating cannot be more than 5",
                ),

            comment: z
                .string()
                .trim()
                .min(
                    1,
                    "Comment is required",
                )
                .max(
                    1000,
                    "Comment cannot exceed 1000 characters",
                ),
        })
        .superRefine((data, ctx) => {
            // Product review
            if (
                data.reviewType ===
                "product"
            ) {
                if (!data.productId) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["productId"],
                        message:
                            "Product ID is required for a product review",
                    });
                }

                if (data.shopId) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["shopId"],
                        message:
                            "Shop ID is not allowed for a product review",
                    });
                }
            }

            // Shop review
            if (
                data.reviewType ===
                "shop"
            ) {
                if (!data.shopId) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["shopId"],
                        message:
                            "Shop ID is required for a shop review",
                    });
                }

                if (data.productId) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["productId"],
                        message:
                            "Product ID is not allowed for a shop review",
                    });
                }
            }
        });

export const reviewIdSchema =
    z.object({
        id: objectIdSchema,
    });

export const reviewQuerySchema =
    z
        .object({
            reviewType: z
                .enum([
                    "product",
                    "shop",
                ])
                .optional(),

            productId:
                objectIdSchema.optional(),

            shopId:
                objectIdSchema.optional(),
        })
        .superRefine((data, ctx) => {
            if (
                data.reviewType ===
                "product" &&
                data.shopId
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["shopId"],
                    message:
                        "Shop ID cannot be used with product review type",
                });
            }

            if (
                data.reviewType ===
                "shop" &&
                data.productId
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["productId"],
                    message:
                        "Product ID cannot be used with shop review type",
                });
            }
        });