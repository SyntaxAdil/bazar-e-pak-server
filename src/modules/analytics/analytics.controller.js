// src/modules/analytics/analytics.controller.js
import {
    analyticsEventSchema,
    analyticsQuerySchema,
} from "./analytics.validation.js";

import {
    trackAnalyticsEvent,
    getAnalytics,
} from "./analytics.service.js";

//track event
export const trackEvent = async (
    req,
    res,
    next,
) => {
    try {
        const data =
            analyticsEventSchema.parse(
                req.body,
            );

        const event =
            await trackAnalyticsEvent(
                data,
                req.user,
            );

        return res
            .status(201)
            .json({
                success: true,
                message:
                    "Analytics event tracked successfully",
                data: event,
            });
    } catch (error) {
        next(error);
    }
};

//get analytics
export const getAnalyticsController =
    async (
        req,
        res,
        next,
    ) => {
        try {
            const query =
                analyticsQuerySchema.parse(
                    req.query,
                );

            const analytics =
                await getAnalytics(
                    query,
                    req.user,
                );

            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "Analytics fetched successfully",
                    data: analytics,
                });
        } catch (error) {
            next(error);
        }
    };