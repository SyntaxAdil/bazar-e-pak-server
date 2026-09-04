import mongoose from "mongoose";
const s = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    grossAmount: { type: Number, min: 0, default: 0 },
    commissionAmount: { type: Number, min: 0, default: 0 },
    netAmount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "failed"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export default mongoose.models.SellerSettlement ||
  mongoose.model("SellerSettlement", s);
