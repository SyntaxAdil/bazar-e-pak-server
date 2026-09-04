// src/modules/products/product.model.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    images: {
      type: [String],
      default: [],
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: false,
      default: null,
      index: true,
    },

    sellerId: {
      type: String,
      default: null,
      index: true,
    },

    source: {
      type: String,
      enum: ["seller", "pakbazaar"],
      default: "seller",
      index: true,
    },

    brand: { type: String, trim: true, maxlength: 120, default: "" },
    isTrending: { type: Boolean, default: false, index: true },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    featuredPriority: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    purchaseCount: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },

    whatsappClicks: {
      type: Number,
      min: 0,
      default: 0,
    },

    callClicks: {
      type: Number,
      min: 0,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

productSchema.index({
  name: "text",
});

productSchema.index({
  categoryId: 1,
  status: 1,
  isDeleted: 1,
});

productSchema.index({
  shopId: 1,
  status: 1,
  isDeleted: 1,
});

productSchema.index({
  sellerId: 1,
  status: 1,
  isDeleted: 1,
});

productSchema.index({
  isFeatured: 1,
  featuredPriority: -1,
  status: 1,
  isDeleted: 1,
});

productSchema.index({
  purchaseCount: -1,
  averageRating: -1,
});

productSchema.index({
  averageRating: -1,
  reviewCount: -1,
});

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
