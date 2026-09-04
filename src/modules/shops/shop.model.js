// src/modules/shops/shop.model.js
import mongoose from "mongoose";

const socialLinkSchema =
    new mongoose.Schema(
        {
            platform: {
                type: String,
                trim: true,
                maxlength: 50,
            },

            url: {
                type: String,
                trim: true,
                maxlength: 500,
            },
        },
        {
            _id: false,
        },
    );

const shopSchema = new mongoose.Schema(
    {
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: "",
        },

        businessType: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
        },

        services: {
            type: [
                {
                    type: String,
                    trim: true,
                    maxlength: 150,
                },
            ],
            default: [],
        },

        logo: {
            type: String,
            trim: true,
            default: null,
        },

        banner: {
            type: String,
            trim: true,
            default: null,
        },

        gallery: {
            type: [String],
            default: [],
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 30,
            default: "",
        },

        whatsapp: {
            type: String,
            trim: true,
            maxlength: 30,
            default: "",
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 150,
            default: "",
        },

        website: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        youtube: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        socialLinks: {
            type: [socialLinkSchema],
            default: [],
        },

        address: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        city: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
        },

        location: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        latitude: {
            type: Number,
            min: -90,
            max: 90,
            default: null,
        },

        longitude: {
            type: Number,
            min: -180,
            max: 180,
            default: null,
        },

        hours: {
            type: Map,
            of: String,
            default: {},
        },

        status: {
            type: String,
            enum: [
                "pending",
                "active",
                "inactive",
                "suspended",
                "rejected",
            ],
            default: "pending",
            index: true,
        },

        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },

        totalReviews: {
            type: Number,
            min: 0,
            default: 0,
        },

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

shopSchema.index({
    sellerId: 1,
    status: 1,
    isDeleted: 1,
});

shopSchema.index({
    status: 1,
    createdAt: -1,
    isDeleted: 1,
});

shopSchema.index({
    name: "text",
    description: "text",
    businessType: "text",
});

shopSchema.index({
    city: 1,
    rating: -1,
});

const Shop =
    mongoose.models.Shop ||
    mongoose.model(
        "Shop",
        shopSchema,
    );

export default Shop;