import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { connectDB } from "./config/database.js";
import apiRoutes from "./routes/index.js";

import errorMiddleware from "./middlewares/error.middleware.js";
import { incrementMetric } from "./utils/system-metrics.js";

const app = express();

app.use((req, res, next) => { incrementMetric("requests"); next(); });

app.use(helmet());

app.use(
    cors({
        origin: env.CLIENT_URL,
        credentials: true,
    }),
);

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max:
        env.NODE_ENV === "development"
            ? 5000
            : 100,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message:
                "Too many requests. Please try again later.",
        });
    },
});

app.use(globalLimiter);


app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    }),
);


app.get("/health", async (req, res, next) => {
    try {
        await connectDB();

        res.status(200).json({
            success: true,
            message: "Bazar-e-Pak server is running",
            data: { api: "up", database: "up", uptimeSeconds: Math.round(process.uptime()) },
        });
    } catch (error) {
        next(error);
    }
});



app.use("/api", async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        next(error);
    }
});


app.use("/api", apiRoutes);



app.use((req, res, next) => {
    const error = new Error(
        `Route not found: ${req.method} ${req.originalUrl}`,
    );

    error.statusCode = 404;

    next(error);
});



app.use((err, req, res, next) => { incrementMetric("errors"); next(err); });

app.use(errorMiddleware);

export default app;