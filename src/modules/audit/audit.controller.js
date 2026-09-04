// src/modules/audit/audit.controller.js
import { auditQuerySchema } from "./audit.validation.js";

import { getAuditLogs } from "./audit.service.js";

//get audit logs
export const getAuditLogsController = async (req, res, next) => {
  try {
    const query = auditQuerySchema.parse(req.query);

    const result = await getAuditLogs(query);

    return res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully",
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
