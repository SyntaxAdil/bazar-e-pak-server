import { recordAuditLog } from "../modules/audit/audit.service.js";

export const safeAudit = async (data) => {
    try { await recordAuditLog(data); }
    catch (error) { console.error("Audit log failed:", error.message); }
};
