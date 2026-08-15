import "dotenv/config";
import { envSchema } from "../schemas/env.schema.js";

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error);
    process.exit(1);
}

export const env = result.data;