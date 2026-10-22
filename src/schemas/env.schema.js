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
    SERVER_URL: z
        .string()
        .min(1, "SERVER_URL is required"),

    CLIENT_URL: z
        .url("CLIENT_URL must be a valid URL"),

    TRUSTED_ORIGINS: z
        .string()
        .min(1, "TRUSTED_ORIGINS is required"),

    // ---- Payments (all optional; PayFast stays disabled until configured) ----
    COD_ENABLED: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
    PAYFAST_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    PAYFAST_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
    PAYFAST_API_BASE_URL: z.string().optional().default(""),
    PAYFAST_MERCHANT_ID: z.string().optional().default(""),
    PAYFAST_SECURED_KEY: z.string().optional().default(""),
    PAYFAST_HASH_ENCODING: z.enum(["hex", "base64"]).default("hex"),
    PAYFAST_HASH_SEPARATOR: z.string().optional().default(""),
    PAYFAST_METHODS: z.string().optional().default("CARD,ACCOUNT,WALLET"),
    PAYFAST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(20000),
    PAYFAST_ESTIMATED_FEE_BPS: z.coerce.number().int().min(0).max(5000).default(0),
    ORDER_PAYMENT_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
});