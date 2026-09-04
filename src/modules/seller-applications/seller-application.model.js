// src/modules/seller-applications/seller-application.model.js
import mongoose from "mongoose";

const sellerApplicationSchema =
    new mongoose.Schema(
        {
            userId: {
                type: String,
                required: true,
                unique: true,
                index: true,
            },

            name: {
                type: String,
                required: true,
                trim: true,
                maxlength: 150,
            },

            email: {
                type: String,
                trim: true,
                lowercase: true,
                maxlength: 150,
            },

            phoneNumber: {
                type: String,
                trim: true,
                maxlength: 30,
                default: "",
            },

            businessName: {
                type: String,
                required: true,
                trim: true,
                maxlength: 150,
            },

            businessType: {
                type: String,
                trim: true,
                maxlength: 100,
                default: "",
            },

            description: {
                type: String,
                trim: true,
                maxlength: 2000,
                default: "",
            },

            address: {
                type: String,
                trim: true,
                maxlength: 500,
                default: "",
            },

            status: {
                type: String,
                enum: [
                    "pending",
                    "approved",
                    "rejected",
                    "suspended",
                ],
                default: "pending",
                index: true,
            },

            submittedAt: {
                type: Date,
                default: Date.now,
            },

            reviewedAt: {
                type: Date,
                default: null,
            },

            reviewedBy: {
                type: String,
                default: null,
            },

            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000,
                default: "",
            },
        },
        {
            timestamps: true,
        },
    );

sellerApplicationSchema.index({
    status: 1,
    createdAt: -1,
});

const SellerApplication =
    mongoose.models.SellerApplication ||
    mongoose.model(
        "SellerApplication",
        sellerApplicationSchema,
    );

export default SellerApplication;