// src/modules/analytics/analytics.service.js
import {
    createAnalyticsEvent,
    aggregateAnalytics,
} from "./analytics.repository.js";

import Product from "../products/product.model.js";
import Shop from "../shops/shop.model.js";

const createError = (
    message,
    statusCode,
) => {
    const error = new Error(
        message,
    );

    error.statusCode =
        statusCode;

    return error;
};

//track event
export const trackAnalyticsEvent =
    async (
        data,
        user,
    ) => {
        const event = {
            ...data,
            userId:
                user?.id
                    ? String(
                          user.id,
                      )
                    : null,
        };

        if (data.productId) {
            const product =
                await Product.findOne({
                    _id: data.productId,
                    isDeleted:
                        false,
                }).lean();

            if (!product) {
                throw createError(
                    "Product not found",
                    404,
                );
            }

            event.shopId =
                product.shopId;

            event.sellerId =
                product.sellerId;
        }

        if (data.shopId) {
            const shop =
                await Shop.findOne({
                    _id: data.shopId,
                    isDeleted:
                        false,
                }).lean();

            if (!shop) {
                throw createError(
                    "Shop not found",
                    404,
                );
            }

            event.sellerId =
                String(
                    shop.sellerId,
                );
        }

        return createAnalyticsEvent(
            event,
        );
    };

//get analytics
export const getAnalytics =
    async (
        query,
        user,
    ) => {
        const match = {};

        if (
            query.startDate ||
            query.endDate
        ) {
            match.createdAt = {};

            if (
                query.startDate
            ) {
                match.createdAt.$gte =
                    new Date(
                        query.startDate,
                    );
            }

            if (
                query.endDate
            ) {
                match.createdAt.$lte =
                    new Date(
                        query.endDate,
                    );
            }
        }

        if (query.eventType) {
            match.eventType =
                query.eventType;
        }

        if (
            query.productId
        ) {
            match.productId =
                query.productId;
        }

        if (query.shopId) {
            match.shopId =
                query.shopId;
        }

        if (
            user?.role ===
            "seller"
        ) {
            match.sellerId =
                String(user.id);
        } else if (
            query.sellerId
        ) {
            if (
                user?.role !==
                "super_admin"
            ) {
                throw createError(
                    "Only the Super Admin can inspect another seller's analytics",
                    403,
                );
            }

            match.sellerId =
                String(
                    query.sellerId,
                );
        }

        const [
            summary,
            byEvent,
        ] =
            await Promise.all([
                aggregateAnalytics([
                    {
                        $match:
                            match,
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: 1,
                            },
                        },
                    },
                ]),

                aggregateAnalytics([
                    {
                        $match:
                            match,
                    },
                    {
                        $group: {
                            _id: "$eventType",
                            count: {
                                $sum: 1,
                            },
                        },
                    },
                    {
                        $sort: {
                            count: -1,
                        },
                    },
                ]),
            ]);

        return {
            totalEvents:
                summary[0]
                    ?.total || 0,

            byEvent,
        };
    };