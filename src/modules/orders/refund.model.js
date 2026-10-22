import mongoose from "mongoose";
const s = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null, index: true },
    amount: { type: Number, min: 0, required: true }, // PKR (legacy/display)
    amountMinor: { type: Number, min: 0, default: 0 },
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "processing", "processed", "failed"],
      default: "requested",
      index: true,
    },
    method: { type: String, enum: ["gateway", "manual", null], default: null },
    requestedBy: { type: String, default: null },
    initiatedBy: { type: String, default: null },
    initiatorRole: { type: String, default: null },
    requestId: { type: String, default: null }, // idempotency key
    gatewayReference: { type: String, default: null },
    gatewayCode: { type: String, default: null },
    gatewayMessage: { type: String, default: null },
    failureReason: { type: String, default: null },
    needsReconciliation: { type: Boolean, default: false },
    splits: { type: [{ _id: false, shopId: mongoose.Schema.Types.ObjectId, amountMinor: Number }], default: [] },
    financialsApplied: { type: Boolean, default: false },
    reservedMinor: { type: Number, min: 0, default: 0 }, // amount currently reserved on the payment
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
s.index({ paymentId: 1, requestId: 1 }, { unique: true, partialFilterExpression: { requestId: { $type: "string" } } });
export default mongoose.models.Refund || mongoose.model("Refund", s);
