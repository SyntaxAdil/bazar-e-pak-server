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
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },

    // Cached shop rating.
    // Actual reviews will be stored in the separate Review module.
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    // Cached number of reviews.
    // Actual Review documents will reference this shop through shopId.
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

// Seller can quickly find their shop.
shopSchema.index({
  sellerId: 1,
  status: 1,
});

// Useful for public shop listing.
shopSchema.index({
  status: 1,
  createdAt: -1,
});

// Useful for shop search.
shopSchema.index({
  name: "text",
  description: "text",
});

const Shop = mongoose.model("Shop", shopSchema);

export default Shop;