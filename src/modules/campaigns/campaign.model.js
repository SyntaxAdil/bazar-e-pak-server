import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    banner: { type: String, trim: true, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "expired", "inactive"],
      default: "draft",
      index: true,
    },
    eligibleProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    eligibleCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ],
    eligibleShops: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],
    discountPercent: { type: Number, min: 0, max: 100, default: null },
    rules: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);
schema.index({ status: 1, startDate: 1, endDate: 1 });
export default mongoose.models.Campaign || mongoose.model("Campaign", schema);
