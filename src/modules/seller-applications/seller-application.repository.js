// src/modules/seller-applications/seller-application.repository.js
import SellerApplication from "./seller-application.model.js";

export const createApplication =
    async (
        data,
    ) => {
        return SellerApplication.create(
            data,
        );
    };

export const findApplicationByUserId =
    async (
        userId,
    ) => {
        return SellerApplication.findOne(
            {
                userId: String(
                    userId,
                ),
            },
        ).lean();
    };

export const findApplicationById =
    async (
        id,
    ) => {
        return SellerApplication.findById(
            id,
        ).lean();
    };

export const findApplications =
    async ({
        filter,
        skip,
        limit,
    }) => {
        return SellerApplication.find(
            filter,
        )
            .sort({
                createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean();
    };

export const countApplications =
    async (
        filter,
    ) => {
        return SellerApplication.countDocuments(
            filter,
        );
    };

export const updateApplication =
    async (
        id,
        data,
    ) => {
        return SellerApplication.findByIdAndUpdate(
            id,
            {
                $set: data,
            },
            {
                returnDocument:
                    "after",
                runValidators: true,
            },
        ).lean();
    };