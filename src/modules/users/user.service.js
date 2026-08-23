import { findAllUsers, findUserById, updateUserBlockedStatus } from "./user.repository.js";

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const getAllUsers = async (user) => {
    if (!user?.id) {
        throw createError(
            "Authenticated user information is required",
            401,
        );
    }

    return findAllUsers();
};

export const updateUserStatusService = async ({
    userId,
    isBlocked,
    requestingUser,
}) => {
    if (!requestingUser?.id) {
        throw createError(
            "Authenticated user information is required",
            401,
        );
    }

    const targetUser = await findUserById(userId);

    if (!targetUser) {
        throw createError("User not found", 404);
    }

    if (targetUser.role === "admin") {
        throw createError(
            "Admins cannot be blocked or unblocked",
            403,
        );
    }

    if (String(targetUser._id) === String(requestingUser.id)) {
        throw createError(
            "You cannot change your own status",
            403,
        );
    }

    return updateUserBlockedStatus(userId, isBlocked);
};