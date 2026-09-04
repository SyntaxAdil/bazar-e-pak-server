import { trackAnalyticsEvent } from "../modules/analytics/analytics.service.js";

export const safeTrack = (data, user = null) => {
    Promise.resolve(trackAnalyticsEvent(data, user)).catch((error) =>
        console.error("Analytics event failed:", error.message)
    );
};
