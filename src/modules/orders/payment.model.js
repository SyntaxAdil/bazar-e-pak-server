import mongoose from "mongoose";
const s = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    provider: { type: String, default: null },
    method: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "pending",
        "authorized",
        "paid",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "PKR" },
    providerReference: { type: String, default: null, index: true },
    paidAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
export default mongoose.models.Payment || mongoose.model("Payment", s);
