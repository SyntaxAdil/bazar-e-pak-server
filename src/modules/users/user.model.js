import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
        },

        emailVerified: {
            type: Boolean,
            default: false,
        },

        role: {
            type: String,
            enum: ["admin", "seller", "customer"],
            default: "customer",
            index: true,
        },

        phoneNumber: {
            type: String,
            default: "",
            trim: true,
        },

        isBlocked: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "user",
    },
);

userSchema.index({
    role: 1,
    createdAt: -1,
});

const User =
    mongoose.models.User ||
    mongoose.model("User", userSchema);

export default User;