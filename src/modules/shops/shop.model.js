import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    logo: {
      type: String,
      trim: true,
      default: null,
    },

    banner: {
      type: String,
      trim: true,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 150,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "inactive",
        "suspended",
        "rejected",
      ],
      default: "pending",
      index: true,
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    totalReviews: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

shopSchema.index({
  sellerId: 1,
  status: 1,
});

shopSchema.index({
  status: 1,
  createdAt: -1,
});

shopSchema.index({
  name: "text",
  description: "text",
});

const Shop = mongoose.model("Shop", shopSchema);

export default Shop;