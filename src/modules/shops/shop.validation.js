// src/modules/shops/shop.validation.js
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

const urlSchema = z.string().url("Invalid URL").optional().nullable();

const socialLinkSchema = z.object({
  platform: z.string().trim().min(1).max(50),

  url: z.string().url().max(500),
});

const hoursSchema = z.record(z.string().max(100));

export const createShopSchema = z.object({
  name: z.string().trim().min(2).max(100),

  description: z.string().trim().max(2000).optional().default(""),

  businessType: z.string().trim().max(100).optional().default(""),

  services: z.array(z.string().trim().max(150)).max(100).optional().default([]),

  logo: urlSchema,

  banner: urlSchema,

  gallery: z.array(z.string().url()).max(20).optional().default([]),

  phone: z.string().trim().max(30).optional().default(""),

  whatsapp: z.string().trim().max(30).optional().default(""),

  email: z.string().trim().email().optional().or(z.literal("")),

  website: urlSchema,

  youtube: urlSchema,

  socialLinks: z.array(socialLinkSchema).max(20).optional().default([]),

  address: z.string().trim().max(500).optional().default(""),

  city: z.string().trim().max(100).optional().default(""),

  location: z.string().trim().max(500).optional().default(""),

  latitude: z.number().min(-90).max(90).nullable().optional(),

  longitude: z.number().min(-180).max(180).nullable().optional(),

  hours: hoursSchema.optional().default({}),
});

export const updateShopSchema = createShopSchema.partial();

export const shopIdSchema = z.object({
  shopId: objectIdSchema,
});

export const shopSlugSchema = z.object({
  slug: z.string().trim().min(1),
});

export const shopListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().max(100).optional(),

  status: z
    .enum(["pending", "active", "inactive", "suspended", "rejected"])
    .optional(),

  sellerId: objectIdSchema.optional(),

  city: z.string().trim().max(100).optional(),

  minRating: z.coerce.number().min(0).max(5).optional(),

  sortBy: z
    .enum(["createdAt", "updatedAt", "name", "rating", "totalReviews"])
    .default("createdAt"),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const updateShopStatusSchema = z.object({
  status: z.enum(["pending", "active", "inactive", "suspended", "rejected"]),
});
