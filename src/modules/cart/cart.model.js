// src/modules/cart/cart.model.js
import mongoose from "mongoose";

const cartItemSchema =
    new mongoose.Schema(
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },

            shop: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Shop",
                required: true,
            },

            quantity: {
                type: Number,
                required: true,
                min: 1,
            },

            price: {
                type: Number,
                required: true,
                min: 0,
            },

            productName: {
                type: String,
                required: true,
                trim: true,
            },

            productImage: {
                type: String,
                default: null,
            },
        },
        {
            _id: true,
        },
    );

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            unique: true,
            index: true,
        },

        items: {
            type: [
                cartItemSchema,
            ],
            default: [],
        },

        totalItems: {
            type: Number,
            default: 0,
        },

        subtotal: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

cartSchema.pre(
    "save",
    function () {
        this.totalItems =
            this.items.reduce(
                (
                    total,
                    item,
                ) =>
                    total +
                    item.quantity,
                0,
            );

        this.subtotal =
            this.items.reduce(
                (
                    total,
                    item,
                ) =>
                    total +
                    item.price *
                        item.quantity,
                0,
            );
    },
);

const Cart =
    mongoose.models.Cart ||
    mongoose.model(
        "Cart",
        cartSchema,
    );

export { Cart };