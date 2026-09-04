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
    quantity: { type: Number, min: 1, required: true },
    unitPrice: { type: Number, min: 0, required: true },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    lineTotal: { type: Number, min: 0, required: true },
  },
  { _id: false },
);
const s = new mongoose.Schema(
  {
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
    currency: { type: String, default: "PKR" },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);
export default mongoose.models.Order || mongoose.model("Order", s);
