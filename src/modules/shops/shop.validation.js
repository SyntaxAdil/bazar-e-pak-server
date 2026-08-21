import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid ID format",
  );

const urlSchema = z
  .string()
  .url("Invalid URL")
  .optional()
  .nullable();

export const createShopSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "Shop name must be at least 2 characters",
    )
    .max(
      100,
      "Shop name cannot exceed 100 characters",
    ),

  description: z
    .string()
    .trim()
    .max(
      2000,
      "Description cannot exceed 2000 characters",
    )
    .optional()
    .default(""),

  logo: urlSchema,

  banner: urlSchema,

  phone: z
    .string()
    .trim()
    .max(
      30,
      "Phone number cannot exceed 30 characters",
    )
    .optional()
    .default(""),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .trim()
    .max(
      500,
      "Address cannot exceed 500 characters",
    )
    .optional()
    .default(""),
});

export const updateShopSchema =
  createShopSchema.partial();

export const shopIdSchema = z.object({
  shopId: objectIdSchema,
});

export const shopSlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required"),
});

export const shopListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20),

  search: z
    .string()
    .trim()
    .max(100)
    .optional(),

  status: z
    .enum([
      "pending",
      "active",
      "inactive",
      "suspended",
      "rejected",
    ])
    .optional(),

  sellerId: objectIdSchema.optional(),
});

export const updateShopStatusSchema = z.object({
  status: z.enum([
    "pending",
    "active",
    "inactive",
    "suspended",
    "rejected",
  ]),
});