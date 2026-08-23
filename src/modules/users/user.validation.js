import { z } from "zod";

export const userQuerySchema = z
    .object({
        search: z.string().trim().max(100).optional(),
        role: z.enum(["customer", "seller"]).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict();

export const userIdSchema = z.object({
    userId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
});

export const updateUserStatusSchema = z.object({
    isBlocked: z.boolean(),
});