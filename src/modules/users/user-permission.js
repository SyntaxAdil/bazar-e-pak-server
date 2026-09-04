import mongoose from "mongoose";
import User from "./user.model.js";
import { ADMIN_PERMISSIONS } from "../../utils/permissions.js";

const err = (m, c = 400) => Object.assign(new Error(m), { statusCode: c });

export const updateAdminPermissions = async (targetId, permissions, actor) => {
  if (actor?.role !== "super_admin")
    throw err("Only the Super Admin can manage admin permissions", 403);
  if (String(targetId) === String(actor.id))
    throw err("The Super Admin permissions cannot be changed here", 403);
  if (!mongoose.isValidObjectId(targetId)) throw err("Invalid user ID", 400);
  const user = await User.findById(targetId).lean();
  if (!user) throw err("User not found", 404);
  if (user.role !== "admin")
    throw err("Only admin accounts have configurable admin permissions", 400);
  const clean = [...new Set(permissions)].filter((p) =>
    ADMIN_PERMISSIONS.includes(p),
  );
  return User.findByIdAndUpdate(
    targetId,
    { $set: { permissions: clean } },
    { new: true },
  )
    .select("name email role permissions status")
    .lean();
};
