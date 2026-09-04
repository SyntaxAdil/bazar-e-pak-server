// src/modules/analytics/analytics.repository.js
import AnalyticsEvent from "./analytics.model.js";

export const createAnalyticsEvent = async (data) => {
  return AnalyticsEvent.create(data);
};

export const aggregateAnalytics = async (pipeline) => {
  return AnalyticsEvent.aggregate(pipeline);
};
