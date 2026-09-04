import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sellerId: { type: String, required: true, index: true },
    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "Product Offer",
    },
    discountPercent: { type: Number, min: 0, max: 100, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "inactive", "expired"],
      default: "draft",
      index: true,
    },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);
schema.index({ productId: 1, status: 1, startDate: 1, endDate: 1 });
export default mongoose.models.ProductOffer ||
  mongoose.model("ProductOffer", schema);
