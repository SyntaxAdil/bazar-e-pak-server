// DNS configuration
import dns from "node:dns"
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import { env } from "./env.js";

let isConnected = false;

export const connectDB = async () => {
    if (isConnected) return;

    try {
        await mongoose.connect(env.DATABASE_URL, {
            dbName: "pakBazar",
        });

        isConnected = true;

        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

// Raw MongoDB access for external collections
export const getDB = () => mongoose.connection.db;