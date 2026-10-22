import mongoose from "mongoose";
// Append-only accounting journal. Entries are never updated or deleted; corrections are new
// entries. `idempotencyKey` is unique, which makes retries and repeated callbacks harmless.
const s = new mongoose.Schema(
  {
    idempotencyKey: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: [
        "charge",
        "gateway_fee",
        "seller_share",
        "platform_share",
        "refund",
        "seller_share_reversal",
        "platform_share_reversal",
        "fee_adjustment",
        "settlement",
      ],
      required: true,
      index: true,
    },
    account: { type: String, enum: ["gateway", "seller", "platform", "customer"], required: true },
    direction: { type: String, enum: ["credit", "debit"], required: true },
    amountMinor: { type: Number, required: true }, // always >= 0; direction carries the sign
    currency: { type: String, default: "PKR" },
    state: { type: String, enum: ["provisional", "final"], default: "provisional" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null, index: true },
    refundId: { type: mongoose.Schema.Types.ObjectId, ref: "Refund", default: null },
    settlementId: { type: mongoose.Schema.Types.ObjectId, ref: "SellerSettlement", default: null },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null, index: true },
    sellerId: { type: String, default: null },
    reference: { type: String, default: null },
    actorId: { type: String, default: null },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
s.index({ shopId: 1, createdAt: -1 });
export default mongoose.models.LedgerEntry || mongoose.model("LedgerEntry", s);
