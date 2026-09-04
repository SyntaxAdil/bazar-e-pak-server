// src/modules/seller-applications/seller-application.validation.js
import { z } from "zod";

export const createSellerApplicationSchema =
    z.object({
        name: z
            .string()
            .trim()
            .min(2)
            .max(150),

        email: z
            .string()
            .email()
            .optional(),

        phoneNumber: z
            .string()
            .trim()
            .max(30)
            .optional()
            .default(""),

        businessName: z
            .string()
            .trim()
            .min(2)
            .max(150),

        businessType: z
            .string()
            .trim()
            .max(100)
            .optional()
            .default(""),

        description: z
            .string()
            .trim()
            .max(2000)
            .optional()
            .default(""),

        address: z
            .string()
            .trim()
            .max(500)
            .optional()
            .default(""),
    });

export const sellerApplicationQuerySchema =
    z.object({
        status: z
            .enum([
                "pending",
                "approved",
                "rejected",
                "suspended",
            ])
            .optional(),

        search: z
            .string()
            .trim()
            .max(100)
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
    });

export const sellerApplicationIdSchema =
    z.object({
        id: z
            .string()
            .regex(
                /^[0-9a-fA-F]{24}$/,
            ),
    });

export const reviewSellerApplicationSchema =
    z.object({
        status: z.enum([
            "approved",
            "rejected",
            "suspended",
        ]),

        rejectionReason: z
            .string()
            .trim()
            .max(1000)
            .optional()
            .default(""),
    });