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
    type: {
      type: String,
      enum: ["charge", "refund", "commission", "settlement"],
      required: true,
    },
    amount: { type: Number, min: 0, required: true },
    currency: { type: String, default: "PKR" },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "reversed"],
      default: "pending",
    },
    reference: { type: String, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
export default mongoose.models.Transaction || mongoose.model("Transaction", s);
