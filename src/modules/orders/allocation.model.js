import mongoose from "mongoose";
// One financial allocation per (order, shop): gross, gateway fee, distributable amount and the
// 60/40 split, plus refund and settlement tracking. All amounts are integer paisa.
const s = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, index: true },
    basketId: { type: String, default: null },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    sellerId: { type: String, default: null, index: true },
    customerId: { type: String, default: null },
    currency: { type: String, default: "PKR" },
    paymentMethod: { type: String, default: null },
    grossMinor: { type: Number, min: 0, required: true },
    gatewayFeeMinor: { type: Number, min: 0, default: 0 },
    distributableMinor: { type: Number, min: 0, required: true },
    sellerBps: { type: Number, default: 6000 },
    platformBps: { type: Number, default: 4000 },
    sellerShareMinor: { type: Number, min: 0, required: true },
    platformShareMinor: { type: Number, min: 0, required: true },
    // provisional = actual gateway fee not yet confirmed; final = fee confirmed by an admin
    accountingState: { type: String, enum: ["provisional", "final"], default: "provisional", index: true },
    feeSource: { type: String, enum: ["none", "estimated", "actual"], default: "none" },
    refundedGrossMinor: { type: Number, min: 0, default: 0 },
    refundReservedMinor: { type: Number, min: 0, default: 0 },
    sellerRefundedMinor: { type: Number, min: 0, default: 0 },
    platformRefundedMinor: { type: Number, min: 0, default: 0 },
    appliedRefunds: { type: [String], default: [] },
    settlementStatus: { type: String, enum: ["unsettled", "included", "settled"], default: "unsettled", index: true },
    settlementId: { type: mongoose.Schema.Types.ObjectId, ref: "SellerSettlement", default: null },
    settlementReference: { type: String, default: null },
    settledAmountMinor: { type: Number, min: 0, default: 0 },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true },
);
s.index({ orderId: 1, shopId: 1 }, { unique: true });
s.index({ shopId: 1, createdAt: -1 });
export default mongoose.models.OrderAllocation || mongoose.model("OrderAllocation", s);
