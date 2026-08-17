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
    "Each image must be a valid URL",
  );

export const createProductSchema =
  z
    .object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Product name must be at least 2 characters",
        )
        .max(
          150,
          "Product name cannot exceed 150 characters",
        ),

      description: z
        .string()
        .trim()
        .min(
          1,
          "Product description is required",
        )
        .max(
          5000,
          "Product description cannot exceed 5000 characters",
        ),

      price: z
        .number()
        .finite()
        .min(
          0,
          "Price cannot be negative",
        ),

      stock: z
        .number()
        .int()
        .min(
          0,
          "Stock cannot be negative",
        ),

      images: z
        .array(imageUrlSchema)
        .max(
          10,
          "A product can have maximum 10 images",
        )
        .default([]),

      categoryId: objectIdSchema,

      shopId: objectIdSchema,

      status: z
        .enum([
          "active",
          "inactive",
        ])
        .default("active"),
    })
    .strict();

export const updateProductSchema =
  z
    .object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Product name must be at least 2 characters",
        )
        .max(
          150,
          "Product name cannot exceed 150 characters",
        )
        .optional(),

      description: z
        .string()
        .trim()
        .min(
          1,
          "Product description cannot be empty",
        )
        .max(
          5000,
          "Product description cannot exceed 5000 characters",
        )
        .optional(),

      price: z
        .number()
        .finite()
        .min(
          0,
          "Price cannot be negative",
        )
        .optional(),

      stock: z
        .number()
        .int()
        .min(
          0,
          "Stock cannot be negative",
        )
        .optional(),

      images: z
        .array(imageUrlSchema)
        .max(
          10,
          "A product can have maximum 10 images",
        )
        .optional(),

      categoryId:
        objectIdSchema.optional(),

      shopId:
        objectIdSchema.optional(),

      status: z
        .enum([
          "active",
          "inactive",
        ])
        .optional(),
    })
    .strict();

export const productIdSchema =
  z.object({
    id: objectIdSchema,
  });

export const productQuerySchema =
  z
    .object({
      search: z
        .string()
        .trim()
        .max(100)
        .optional(),

      categoryId:
        objectIdSchema.optional(),

      shopId:
        objectIdSchema.optional(),

      status: z
        .enum([
          "active",
          "inactive",
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
    })
    .strict();