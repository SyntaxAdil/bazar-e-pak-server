// src/modules/users/user.validation.js
import { z } from "zod";

const objectIdSchema = z
    .string()
    .regex(
        /^[0-9a-fA-F]{24}$/,
        "Invalid ID format",
    );

export const userQuerySchema = z
    .object({
        search: z
            .string()
            .trim()
            .max(100)
            .optional(),

        role: z
            .enum([
                "customer",
                "seller",
                "admin",
                "super_admin",
            ])
            .optional(),

        status: z
            .enum([
                "active",
                "suspended",
                "banned",
            ])
            .optional(),

        isBlocked: z
            .enum(["true", "false"])
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

        sortBy: z
            .enum([
                "createdAt",
                "updatedAt",
                "name",
                "email",
                "role",
            ])
            .default("createdAt"),

        sortOrder: z
            .enum(["asc", "desc"])
            .default("desc"),
    })
    .strict();

export const userIdSchema = z.object({
    userId: objectIdSchema,
});

export const updateUserStatusSchema =
    z.object({
        status: z.enum([
            "active",
            "suspended",
            "banned",
        ]),

        isBlocked: z
            .boolean()
            .optional(),
    });

export const updateUserRoleSchema =
    z.object({
        role: z.enum([
            "customer",
            "seller",
            "admin",
        ]),
    });

export const updateAdminPermissionsSchema = z.object({
    permissions: z.array(z.string().trim().min(1)).max(50),
});