// src/modules/category/category.validation.js
import { z } from "zod";

const objectIdSchema = z
    .string()
    .regex(
        /^[0-9a-fA-F]{24}$/,
        "Invalid MongoDB ObjectId",
    );

const imageUrlSchema = z
    .string()
    .url(
        "Image must be a valid URL",
    );

export const createCategorySchema =
    z
        .object({
            name: z
                .string()
                .trim()
                .min(2)
                .max(100),

            slug: z
                .string()
                .trim()
                .min(2)
                .max(120)
                .regex(
                    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                )
                .optional(),

            description: z
                .string()
                .trim()
                .max(1000)
                .optional(),

            image:
                imageUrlSchema.optional(),

            status: z
                .enum([
                    "active",
                    "inactive",
                ])
                .default("active"),

            order: z.coerce
                .number()
                .int()
                .min(0)
                .default(0),
        })
        .strict();

export const updateCategorySchema =
    z
        .object({
            name: z
                .string()
                .trim()
                .min(2)
                .max(100)
                .optional(),

            slug: z
                .string()
                .trim()
                .min(2)
                .max(120)
                .regex(
                    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                )
                .optional(),

            description: z
                .string()
                .trim()
                .max(1000)
                .optional(),

            image:
                imageUrlSchema.optional(),

            status: z
                .enum([
                    "active",
                    "inactive",
                ])
                .optional(),

            order: z.coerce
                .number()
                .int()
                .min(0)
                .optional(),
        })
        .strict()
        .refine(
            (data) =>
                Object.keys(data)
                    .length > 0,
            {
                message:
                    "At least one field is required for update",
            },
        );

export const categoryIdSchema = z.object({
    id: objectIdSchema,
});

export const categorySlugSchema = z.object({
    slug: z
        .string()
        .trim()
        .min(1),
});

export const categoryQuerySchema = z
    .object({
        search: z
            .string()
            .trim()
            .max(100)
            .optional(),

        status: z
            .enum([
                "active",
                "inactive",
            ])
            .optional(),

        sortBy: z
            .enum([
                "createdAt",
                "updatedAt",
                "name",
                "order",
            ])
            .default("order"),

        sortOrder: z
            .enum([
                "asc",
                "desc",
            ])
            .default("asc"),

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
    })
    .strict();