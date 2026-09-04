import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    channel: {
      type: String,
      enum: ["in_app", "email", "sms", "whatsapp"],
      default: "in_app",
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "read"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);
schema.index({ userId: 1, createdAt: -1 });
export default mongoose.models.Notification ||
  mongoose.model("Notification", schema);
