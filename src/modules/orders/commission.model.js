import mongoose from "mongoose";
const s = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    sellerId: { type: String, required: true, index: true },
    rate: { type: Number, min: 0, max: 100, default: 0 },
    amount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["pending", "applied", "reversed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);
export default mongoose.models.PlatformCommission ||
  mongoose.model("PlatformCommission", s);
