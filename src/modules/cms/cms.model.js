import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      enum: ["hero", "banner", "homepage", "page", "template", "announcement"],
      required: true,
      index: true,
    },
    title: { type: String, trim: true, default: "" },
    slug: { type: String, trim: true, lowercase: true, default: "" },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    locale: { type: String, enum: ["en", "ur"], default: "en", index: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "inactive", "expired"],
      default: "draft",
      index: true,
    },
    order: { type: Number, default: 0, index: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);
schema.index({ key: 1, locale: 1 }, { unique: true });
schema.index({ type: 1, status: 1, order: 1 });
export default mongoose.models.CmsContent ||
  mongoose.model("CmsContent", schema);
