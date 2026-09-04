// src/modules/audit/audit.validation.js
import { z } from "zod";

export const auditQuerySchema =
    z.object({
        actorId: z
            .string()
            .optional(),

        action: z
            .string()
            .trim()
            .max(100)
            .optional(),

        resourceType: z
            .string()
            .trim()
            .max(100)
            .optional(),

        resourceId: z
            .string()
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