// DNS configuration
import dns from "node:dns"
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            return mongoose.connection;
        }

        await mongoose.connect(env.DATABASE_URL, {
            dbName: "pakBazar",
        });

        console.log("MongoDB connected");

        return mongoose.connection;
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        throw error;
    }
};

export const getDB = () => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("MongoDB is not connected");
    }

    return mongoose.connection.db;
};