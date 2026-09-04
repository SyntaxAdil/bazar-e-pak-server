// src/modules/audit/audit.service.js
import {
    createAuditLog,
    findAuditLogs,
    countAuditLogs,
} from "./audit.repository.js";

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

//create audit log
export const recordAuditLog =
    async ({
        actor,
        action,
        resourceType,
        resourceId,
        reason = "",
        previousState = null,
        newState = null,
        metadata = {},
    }) => {
        if (!actor?.id) {
            throw createError(
                "Authenticated user information is required",
                401,
            );
        }

        return createAuditLog({
            actorId: String(
                actor.id,
            ),
            actorRole:
                actor.role,
            action,
            resourceType,
            resourceId:
                resourceId
                    ? String(
                          resourceId,
                      )
                    : null,
            reason,
            previousState,
            newState,
            metadata,
        });
    };

//get audit logs
export const getAuditLogs =
    async (
        query,
    ) => {
        const {
            actorId,
            action,
            resourceType,
            resourceId,
            page,
            limit,
        } = query;

        const filter = {};

        if (actorId) {
            filter.actorId =
                actorId;
        }

        if (action) {
            filter.action =
                action;
        }

        if (resourceType) {
            filter.resourceType =
                resourceType;
        }

        if (resourceId) {
            filter.resourceId =
                resourceId;
        }

        const skip =
            (page - 1) *
            limit;

        const [
            logs,
            total,
        ] = await Promise.all([
            findAuditLogs({
                filter,
                skip,
                limit,
            }),

            countAuditLogs(
                filter,
            ),
        ]);

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages:
                    Math.ceil(
                        total /
                            limit,
                    ),
            },
        };
    };