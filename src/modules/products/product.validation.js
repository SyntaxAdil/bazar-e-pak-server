// src/modules/products/product.validation.js
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const imageUrlSchema = z.string().url("Each image must be a valid URL");

const discountSchema = z
  .number()
  .finite()
  .min(0, "Discount cannot be negative")
  .max(100, "Discount cannot exceed 100%");

export const createProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Product name must be at least 2 characters")
      .max(150, "Product name cannot exceed 150 characters"),

    description: z
      .string()
      .trim()
      .min(1, "Product description is required")
      .max(5000, "Product description cannot exceed 5000 characters"),

    price: z.number().finite().min(0, "Price cannot be negative"),

    discount: discountSchema.default(0),

    stock: z.number().int().min(0, "Stock cannot be negative"),

    images: z
      .array(imageUrlSchema)
      .max(10, "A product can have maximum 10 images")
      .default([]),

    categoryId: objectIdSchema,

    shopId: objectIdSchema,

    status: z.enum(["active", "inactive"]).default("active"),
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),

    description: z.string().trim().min(1).max(5000).optional(),

    price: z.number().finite().min(0).optional(),

    discount: discountSchema.optional(),

    stock: z.number().int().min(0).optional(),

    images: z.array(imageUrlSchema).max(10).optional(),

    categoryId: objectIdSchema.optional(),

    shopId: objectIdSchema.optional(),

    status: z.enum(["active", "inactive"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
  });

export const productIdSchema = z.object({
  id: objectIdSchema,
});

export const productQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),

    categoryId: objectIdSchema.optional(),

    shopId: objectIdSchema.optional(),

    sellerId: objectIdSchema.optional(),

    status: z.enum(["active", "inactive"]).optional(),

    isFeatured: z.enum(["true", "false"]).optional(),

    minPrice: z.coerce.number().min(0).optional(),

    maxPrice: z.coerce.number().min(0).optional(),

    minRating: z.coerce.number().min(0).max(5).optional(),

    inStock: z.enum(["true", "false"]).optional(),

    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "price",
        "averageRating",
        "reviewCount",
        "purchaseCount",
        "name",
      ])
      .default("createdAt"),

    sortOrder: z.enum(["asc", "desc"]).default("desc"),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    {
      message: "Minimum price cannot exceed maximum price",
      path: ["minPrice"],
    },
  );

export const productFeatureSchema = z.object({
  isFeatured: z.boolean(),
  priority: z.number().int().min(0).max(100000).default(0),
});

export const productTrackingSchema = z.object({
  type: z.enum([
    "product_view",
    "product_click",
    "whatsapp",
    "call",
    "website",
    "location",
    "youtube",
    "social",
    "share",
    "add_to_cart",
  ]),
});

export const bestSellingQuerySchema = z
  .object({
    shopId: objectIdSchema.optional(),

    categoryId: objectIdSchema.optional(),

    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();
