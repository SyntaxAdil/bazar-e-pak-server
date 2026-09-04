// src/modules/reviews/review.validation.js
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
                .min(1)
                .max(5),

            comment: z
                .string()
                .trim()
                .min(1)
                .max(1000),
        })
        .superRefine(
            (data, ctx) => {
                if (
                    data.reviewType ===
                    "product"
                ) {
                    if (
                        !data.productId
                    ) {
                        ctx.addIssue({
                            code: "custom",
                            path: [
                                "productId",
                            ],
                            message:
                                "Product ID is required for a product review",
                        });
                    }

                    if (data.shopId) {
                        ctx.addIssue({
                            code: "custom",
                            path: [
                                "shopId",
                            ],
                            message:
                                "Shop ID is not allowed for a product review",
                        });
                    }
                }

                if (
                    data.reviewType ===
                    "shop"
                ) {
                    if (
                        !data.shopId
                    ) {
                        ctx.addIssue({
                            code: "custom",
                            path: [
                                "shopId",
                            ],
                            message:
                                "Shop ID is required for a shop review",
                        });
                    }

                    if (
                        data.productId
                    ) {
                        ctx.addIssue({
                            code: "custom",
                            path: [
                                "productId",
                            ],
                            message:
                                "Product ID is not allowed for a shop review",
                        });
                    }
                }
            },
        );

export const reviewIdSchema = z.object({
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

            rating: z.coerce
                .number()
                .int()
                .min(1)
                .max(5)
                .optional(),

            status: z
                .enum([
                    "published",
                    "hidden",
                    "removed",
                ])
                .optional(),

            page: z.coerce
                .number()
                .int()
                .min(1)
                .default(1),

            limit: z.coerce
                .number()
                .int()
                .min(1)
                .max(100)
                .default(20),

            sortOrder: z
                .enum([
                    "asc",
                    "desc",
                ])
                .default("desc"),
        })
        .strict();

export const moderateReviewSchema =
    z.object({
        status: z.enum([
            "published",
            "hidden",
            "removed",
        ]),

        reason: z
            .string()
            .trim()
            .max(500)
            .optional()
            .default(""),
    });