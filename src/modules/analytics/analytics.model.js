// src/modules/analytics/analytics.model.js
import mongoose from "mongoose";

const analyticsEventSchema =
    new mongoose.Schema(
        {
            eventType: {
                type: String,
                enum: [
                    "PRODUCT_VIEW",
                    "PRODUCT_CLICK",
                    "SHOP_VIEW",
                    "SHOP_CLICK",
                    "WHATSAPP_CLICK",
                    "CALL_CLICK",
                    "WEBSITE_CLICK",
                    "LOCATION_CLICK",
                    "YOUTUBE_CLICK",
                    "SOCIAL_CLICK",
                    "SHARE",
                    "SEARCH",
                    "CATEGORY_VIEW",
                    "ADD_TO_CART",
                    "REVIEW_CREATED",
                    "ORDER_CREATED",
                    "ORDER_COMPLETED",
                ],
                required: true,
                index: true,
            },

            userId: {
                type: String,
                default: null,
                index: true,
            },

            visitorId: {
                type: String,
                default: null,
                index: true,
            },

            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                default: null,
                index: true,
            },

            shopId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Shop",
                default: null,
                index: true,
            },

            sellerId: {
                type: String,
                default: null,
                index: true,
            },

            categoryId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Category",
                default: null,
                index: true,
            },

            searchKeyword: {
                type: String,
                trim: true,
                default: null,
            },

            resultCount: {
                type: Number,
                min: 0,
                default: null,
            },

            source: {
                type: String,
                trim: true,
                default: null,
            },

            page: {
                type: String,
                trim: true,
                default: null,
            },

            metadata: {
                type: mongoose.Schema.Types.Mixed,
                default: {},
            },
        },
        {
            timestamps: true,
        },
    );

analyticsEventSchema.index({
    eventType: 1,
    createdAt: -1,
});

analyticsEventSchema.index({
    sellerId: 1,
    eventType: 1,
    createdAt: -1,
});

analyticsEventSchema.index({
    productId: 1,
    eventType: 1,
    createdAt: -1,
});

analyticsEventSchema.index({
    shopId: 1,
    eventType: 1,
    createdAt: -1,
});

const AnalyticsEvent =
    mongoose.models.AnalyticsEvent ||
    mongoose.model(
        "AnalyticsEvent",
        analyticsEventSchema,
    );

export default AnalyticsEvent;