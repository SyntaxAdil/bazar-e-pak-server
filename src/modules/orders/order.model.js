import mongoose from "mongoose";
const item = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    sellerId: { type: String, default: null },
    productName: { type: String, default: "" },
    quantity: { type: Number, min: 1, required: true },
    unitPrice: { type: Number, min: 0, required: true },
    unitPriceMinor: { type: Number, min: 0, default: 0 },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    lineTotal: { type: Number, min: 0, required: true },
    lineTotalMinor: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);
const s = new mongoose.Schema(
  {
    orderNumber: { type: String, default: null },
    customerId: { type: String, required: true, index: true },
    items: { type: [item], default: [] },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "draft",
      index: true,
    },
    subtotal: { type: Number, min: 0, default: 0 },
    discountTotal: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, default: 0 },
    // integer paisa (authoritative); the Number fields above are PKR for backward compatibility
    totalMinor: { type: Number, min: 0, default: 0 },
    refundedMinor: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "PKR" },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, default: null },
    paymentMethod: { type: String, enum: ["cod", "payfast", null], default: null },
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "cancelled",
        "cod_pending",
        "partially_refunded",
        "refunded",
      ],
      default: "unpaid",
      index: true,
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    shopIds: { type: [mongoose.Schema.Types.ObjectId], default: [], index: true },
    checkoutKey: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    stockReserved: { type: Boolean, default: false },
    stockReleasedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    codCollectedAt: { type: Date, default: null },
    codCollectedBy: { type: String, default: null },
  },
  { timestamps: true },
);
s.index({ orderNumber: 1 }, { unique: true, partialFilterExpression: { orderNumber: { $type: "string" } } });
s.index({ customerId: 1, checkoutKey: 1 }, { unique: true, partialFilterExpression: { checkoutKey: { $type: "string" } } });
s.index({ shopIds: 1, createdAt: -1 });
s.index({ paymentStatus: 1, expiresAt: 1 });
export default mongoose.models.Order || mongoose.model("Order", s);
