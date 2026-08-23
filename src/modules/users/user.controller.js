import { getAllUsers, updateUserStatusService } from "./user.service.js";
import { userIdSchema, updateUserStatusSchema } from "./user.validation.js";

export const getUsers = async (req, res, next) => {
    try {
        const users = await getAllUsers(req.user);

        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: users,
        });
    } catch (error) {
        next(error);
    }
};

export const updateUserStatus = async (req, res, next) => {
    try {
        const { userId } = userIdSchema.parse(req.params);
        const { isBlocked } = updateUserStatusSchema.parse(req.body);

        const user = await updateUserStatusService({
            userId,
            isBlocked,
            requestingUser: req.user,
        });

        return res.status(200).json({
            success: true,
            message: isBlocked
                ? "User suspended successfully"
                : "User unsuspended successfully",
            data: user,
        });
    } catch (error) {
        next(error);
    }
};