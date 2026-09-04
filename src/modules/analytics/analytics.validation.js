// src/modules/analytics/analytics.validation.js
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const analyticsEventSchema = z.object({
  eventType: z.enum([
    "PRODUCT_VIEW",
    "PRODUCT_CLICK",
    "SHOP_VIEW",
    "SHOP_CLICK",
    "WHATSAPP_CLICK",
    "CALL_CLICK",
    "WEBSITE_CLICK",
    "LOCATION_CLICK",
    "YOUTUBE_CLICK",
    "SOCIAL_CLICK",
    "SHARE",
    "SEARCH",
    "CATEGORY_VIEW",
    "ADD_TO_CART",
    "REVIEW_CREATED",
    "ORDER_CREATED",
    "ORDER_COMPLETED",
  ]),

  visitorId: z.string().trim().max(200).optional(),

  productId: objectIdSchema.optional(),

  shopId: objectIdSchema.optional(),

  categoryId: objectIdSchema.optional(),

  searchKeyword: z.string().trim().max(200).optional(),

  resultCount: z.number().int().min(0).optional(),

  source: z.string().trim().max(100).optional(),

  page: z.string().trim().max(500).optional(),

  metadata: z.record(z.any()).optional(),
});

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),

  endDate: z.string().datetime().optional(),

  sellerId: z.string().optional(),

  shopId: objectIdSchema.optional(),

  productId: objectIdSchema.optional(),

  eventType: z.string().optional(),
});
