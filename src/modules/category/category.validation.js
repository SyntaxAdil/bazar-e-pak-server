import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId",
  );

const imageUrlSchema = z
  .string()
  .url("Image must be a valid URL");

export const createCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Category name must be at least 2 characters",
      )
      .max(
        100,
        "Category name cannot exceed 100 characters",
      ),

    slug: z
      .string()
      .trim()
      .min(
        2,
        "Category slug must be at least 2 characters",
      )
      .max(
        120,
        "Category slug cannot exceed 120 characters",
      )
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug can only contain lowercase letters, numbers and hyphens",
      )
      .optional(),

    description: z
      .string()
      .trim()
      .max(
        1000,
        "Category description cannot exceed 1000 characters",
      )
      .optional(),

    image: imageUrlSchema.optional(),

    status: z
      .enum(["active", "inactive"])
      .default("active"),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Category name must be at least 2 characters",
      )
      .max(
        100,
        "Category name cannot exceed 100 characters",
      )
      .optional(),

    slug: z
      .string()
      .trim()
      .min(
        2,
        "Category slug must be at least 2 characters",
      )
      .max(
        120,
        "Category slug cannot exceed 120 characters",
      )
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug can only contain lowercase letters, numbers and hyphens",
      )
      .optional(),

    description: z
      .string()
      .trim()
      .max(
        1000,
        "Category description cannot exceed 1000 characters",
      )
      .optional(),

    image: imageUrlSchema.optional(),

    status: z
      .enum(["active", "inactive"])
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
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
    .min(
      1,
      "Category slug is required",
    ),
});

export const categoryQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100)
      .optional(),

    status: z
      .enum(["active", "inactive"])
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