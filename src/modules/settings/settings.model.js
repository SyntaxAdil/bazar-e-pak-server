import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    description: { type: String, default: "" },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);
export default mongoose.models.PlatformSetting ||
  mongoose.model("PlatformSetting", schema);
