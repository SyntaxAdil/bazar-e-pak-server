// src/modules/category/category.model.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
            index: true,
        },

        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },

        image: {
            type: String,
            trim: true,
            default: "",
        },

        status: {
            type: String,
            enum: [
                "active",
                "inactive",
            ],
            default: "active",
            index: true,
        },

        order: {
            type: Number,
            min: 0,
            default: 0,
            index: true,
        },

        createdBy: {
            type: String,
            required: true,
            index: true,
        },

        updatedBy: {
            type: String,
            default: null,
        },

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

categorySchema.index({
    name: "text",
    description: "text",
});

categorySchema.index({
    status: 1,
    isDeleted: 1,
    order: 1,
});

const Category =
    mongoose.models.Category ||
    mongoose.model(
        "Category",
        categorySchema,
    );

export default Category;