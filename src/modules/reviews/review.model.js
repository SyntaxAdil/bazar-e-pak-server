import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        reviewType: {
            type: String,
            enum: ["product", "shop"],
            required: true,
            index: true,
        },

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            default: null,
            index: true,
        },

        shopId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            default: null,
            index: true,
        },

        userId: {
            type: String,
            required: true,
            index: true,
        },

        userName: {
            type: String,
            trim: true,
            default: "Customer",
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },

        comment: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
    },
    {
        timestamps: true,
    }
);

// Product review lookup
reviewSchema.index({
    reviewType: 1,
    productId: 1,
    createdAt: -1,
});

// Shop review lookup
reviewSchema.index({
    reviewType: 1,
    shopId: 1,
    createdAt: -1,
});

const Review =
    mongoose.models.Review ||
    mongoose.model("Review", reviewSchema);

export default Review;