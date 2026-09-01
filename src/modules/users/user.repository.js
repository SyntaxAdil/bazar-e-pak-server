import mongoose from "mongoose";

export const findAllUsers = async () => {
    return mongoose.connection.db
        .collection("user")
        .find(
            {
                role: { $ne: "admin" },
            },
            {
                projection: {
                    name: 1,
                    email: 1,
                    role: 1,
                    phoneNumber: 1,
                    isBlocked: 1,
                    createdAt: 1,
                },
            },
        )
        .sort({ createdAt: -1 })
        .toArray();
};

export const findUserById = async (userId) => {
    return mongoose.connection.db
        .collection("user")
        .findOne({
            _id: new mongoose.Types.ObjectId(userId),
        });
};

export const updateUserBlockedStatus = async (
    userId,
    isBlocked,
) => {
    await mongoose.connection.db
        .collection("user")
        .updateOne(
            { _id: new mongoose.Types.ObjectId(userId) },
            { $set: { isBlocked } },
        );

    return mongoose.connection.db
        .collection("user")
        .findOne(
            { _id: new mongoose.Types.ObjectId(userId) },
            {
                projection: {
                    name: 1,
                    email: 1,
                    role: 1,
                    phoneNumber: 1,
                    isBlocked: 1,
                    createdAt: 1,
                },
            },
        );
};