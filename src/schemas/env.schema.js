import { z } from "zod";

export const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    PORT: z.coerce
        .number()
        .int()
        .positive()
        .default(5000),

    DATABASE_URL: z
        .string()
        .min(1, "DATABASE_URL is required"),

    CLIENT_URL: z
        .url("CLIENT_URL must be a valid URL"),

    TRUSTED_ORIGINS: z
        .string()
        .min(1, "TRUSTED_ORIGINS is required"),
});