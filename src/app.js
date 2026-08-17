import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { connectDB } from "./config/database.js";
import apiRoutes from "./routes/index.js";

import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

// Security middleware
app.use(helmet());

app.use(
    cors({
        origin: env.CLIENT_URL,
        credentials: true,
    })
);

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: env.NODE_ENV === "development" ? 1000 : 100,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

// Parse request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", async (req, res, next) => {
    try {
        await connectDB();

        res.status(200).json({
            success: true,
            message: "Bazar-e-Pak server is running",
        });
    } catch (error) {
        next(error);
    }
});

// Connect database before API requests
app.use("/api", async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        next(error);
    }
});

// API routes
app.use("/api", apiRoutes);

// Handle unknown routes
app.use((req, res, next) => {
    const error = new Error(
        `Route not found: ${req.method} ${req.originalUrl}`
    );

    error.statusCode = 404;

    next(error);
});

// Global error handler
app.use(errorMiddleware);

export default app;