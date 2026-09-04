// src/modules/audit/audit.model.js
import mongoose from "mongoose";

const auditLogSchema =
    new mongoose.Schema(
        {
            actorId: {
                type: String,
                required: true,
                index: true,
            },

            actorRole: {
                type: String,
                required: true,
                index: true,
            },

            action: {
                type: String,
                required: true,
                index: true,
            },

            resourceType: {
                type: String,
                required: true,
                index: true,
            },

            resourceId: {
                type: String,
                default: null,
                index: true,
            },

            reason: {
                type: String,
                trim: true,
                maxlength: 1000,
                default: "",
            },

            previousState: {
                type: mongoose.Schema.Types.Mixed,
                default: null,
            },

            newState: {
                type: mongoose.Schema.Types.Mixed,
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

auditLogSchema.index({
    actorId: 1,
    createdAt: -1,
});

auditLogSchema.index({
    resourceType: 1,
    resourceId: 1,
    createdAt: -1,
});

const AuditLog =
    mongoose.models.AuditLog ||
    mongoose.model(
        "AuditLog",
        auditLogSchema,
    );

export default AuditLog;