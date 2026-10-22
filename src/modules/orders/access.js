import mongoose from "mongoose";
import Shop from "../shops/shop.model.js";
import { hasPermission } from "../../utils/permissions.js";

export const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

export const isStaff = (user) => user?.role === "admin" || user?.role === "super_admin";

export const assertObjectId = (id, label = "ID") => {
  if (!mongoose.isValidObjectId(id) || String(id).length !== 24) throw httpError(`Invalid ${label}`, 400);
  return String(id);
};

// staff (admin w/ permission, or super_admin) gate used inside services as a second line of defence
export const assertStaffPermission = (user, permission) => {
  if (!user) throw httpError("Unauthorized", 401);
  if (!isStaff(user) || !hasPermission(user, permission)) throw httpError("Forbidden - Permission required", 403);
};

// Seller shop is derived ONLY from the authenticated identity + verified ownership (Shop.sellerId).
export const getOwnedShop = async (user) => {
  if (!user || user.role !== "seller") throw httpError("Forbidden - Insufficient permissions", 403);
  const shop = await Shop.findOne({ sellerId: user.id, isDeleted: false }).select("_id name slug status sellerId").lean();
  if (!shop) throw httpError("You do not have a shop", 404);
  return shop;
};

export const parsePage = (q = {}) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};
export const pageMeta = ({ page, limit }, total) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });
