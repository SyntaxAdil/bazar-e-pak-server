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
    amount: { type: Number, min: 0, required: true },
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "processed"],
      default: "requested",
      index: true,
    },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export default mongoose.models.Refund || mongoose.model("Refund", s);
