import mongoose from "mongoose";
// Internal settlement TRACKING record: what PakBazaar owes a seller. Marking it
// "paid" only records an out-of-band bank transfer made by an administrator; no
// payout is ever initiated through PayFast by this backend.
const s = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null, index: true },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    allocationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "OrderAllocation" }],
    grossAmount: { type: Number, min: 0, default: 0 },
    commissionAmount: { type: Number, min: 0, default: 0 },
    netAmount: { type: Number, min: 0, default: 0 },
    grossMinor: { type: Number, min: 0, default: 0 },
    platformShareMinor: { type: Number, min: 0, default: 0 },
    netMinor: { type: Number, min: 0, default: 0 }, // seller payable
    currency: { type: String, default: "PKR" },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "failed"],
      default: "pending",
      index: true,
    },
    reference: { type: String, default: null }, // bank transfer / payout reference entered by admin
    note: { type: String, default: "" },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export default mongoose.models.SellerSettlement ||
  mongoose.model("SellerSettlement", s);
