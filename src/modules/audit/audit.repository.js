// src/modules/audit/audit.repository.js
import AuditLog from "./audit.model.js";

export const createAuditLog = async (data) => {
  return AuditLog.create(data);
};

export const findAuditLogs = async ({ filter, skip, limit }) => {
  return AuditLog.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countAuditLogs = async (filter) => {
  return AuditLog.countDocuments(filter);
};
