// src/modules/cart/cart.repository.js
import { Cart } from "./cart.model.js";

export const findCartByUserId =
    async (
        userId,
    ) => {
        return Cart.findOne({
            user: userId,
        })
            .populate({
                path: "items.product",
                select:
                    "name price stock images status shopId categoryId discount",
            })
            .populate({
                path: "items.shop",
                select:
                    "name slug status",
            });
    };

export const findCartByUserIdRaw =
    async (
        userId,
    ) => {
        return Cart.findOne({
            user: userId,
        });
    };

export const createCart = async (
    userId,
) => {
    return Cart.create({
        user: userId,
        items: [],
    });
};

export const saveCart = async (
    cart,
) => {
    return cart.save();
};

export const deleteCart = async (
    userId,
) => {
    return Cart.findOneAndUpdate(
        {
            user: userId,
        },
        {
            $set: {
                items: [],
                totalItems: 0,
                subtotal: 0,
            },
        },
        {
            returnDocument:
                "after",
        },
    );
};