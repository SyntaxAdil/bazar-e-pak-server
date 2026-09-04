// src/modules/users/user.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: "",
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            index: true,
        },

        emailVerified: {
            type: Boolean,
            default: false,
        },

        role: {
            type: String,
            enum: [
                "customer",
                "seller",
                "admin",
                "super_admin",
            ],
            default: "customer",
            index: true,
        },

        phoneNumber: {
            type: String,
            default: "",
            trim: true,
        },

        isBlocked: {
            type: Boolean,
            default: false,
            index: true,
        },

        status: {
            type: String,
            enum: [
                "active",
                "suspended",
                "banned",
            ],
            default: "active",
            index: true,
        },

        permissions: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
        collection: "user",
    },
);

userSchema.index({
    role: 1,
    createdAt: -1,
});

userSchema.index({
    status: 1,
    createdAt: -1,
});

const User =
    mongoose.models.User ||
    mongoose.model("User", userSchema);

export default User;