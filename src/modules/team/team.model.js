import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    designation: { type: String, required: true, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 2000, default: "" },
    picture: { type: String, trim: true, default: "" },
    socialLinks: { type: [{ platform: String, url: String }], default: [] },
    order: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);
schema.index({ status: 1, order: 1 });
export default mongoose.models.TeamMember ||
  mongoose.model("TeamMember", schema);
