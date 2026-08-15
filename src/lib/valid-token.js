import { jwtVerify, createRemoteJWKSet } from "jose";
import { env } from "../config/env.js";

const JWKS = createRemoteJWKSet(
    new URL(`${env.SERVER_URL}/api/auth/jwks`)
);

const validateToken = async (token) => {
    try {
        const { payload } = await jwtVerify(token, JWKS);

        return payload;
    } catch (error) {
        console.error("Token validation failed:", error.message);
        throw error;
    }
};

export default validateToken;