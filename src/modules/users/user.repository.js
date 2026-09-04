// src/modules/users/user.repository.js
import mongoose from "mongoose";

const getCollection = () =>
    mongoose.connection.db.collection("user");

export const findUsers = async ({
    filter,
    skip,
    limit,
    sort,
}) => {
    return getCollection()
        .find(
            filter,
            {
                projection: {
                    name: 1,
                    email: 1,
                    emailVerified: 1,
                    role: 1,
                    phoneNumber: 1,
                    isBlocked: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        )
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
};

export const countUsers = async (
    filter,
) => {
    return getCollection().countDocuments(
        filter,
    );
};

export const findUserById = async (
    userId,
) => {
    return getCollection().findOne({
        _id: new mongoose.Types.ObjectId(
            userId,
        ),
    });
};

export const updateUserStatus = async (
    userId,
    updateData,
) => {
    await getCollection().updateOne(
        {
            _id: new mongoose.Types.ObjectId(
                userId,
            ),
        },
        {
            $set: {
                ...updateData,
                updatedAt: new Date(),
            },
        },
    );

    return findUserById(userId);
};

export const updateUserRole = async (
    userId,
    role,
) => {
    await getCollection().updateOne(
        {
            _id: new mongoose.Types.ObjectId(
                userId,
            ),
        },
        {
            $set: {
                role,
                updatedAt: new Date(),
            },
        },
    );

    return findUserById(userId);
};