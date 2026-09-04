import Product from "./product.model.js";
import { findCategoryById } from "../category/category.repository.js";
import { safeAudit } from "../../utils/audit.js";

const err = (m, c = 400) => Object.assign(new Error(m), { statusCode: c });
const oid = (id) => /^[0-9a-fA-F]{24}$/.test(String(id));
const validate = (d) => {
  if (
    !d.name ||
    !d.description ||
    d.price === undefined ||
    d.stock === undefined ||
    !d.categoryId
  )
    throw err("name, description, price, stock and categoryId are required");
  if (!oid(d.categoryId)) throw err("Invalid category ID");
};
export const createNativeProduct = async (data, user) => {
  if (user?.role !== "super_admin")
    throw err("Only the Super Admin can manage native products", 403);
  validate(data);
  const cat = await findCategoryById(data.categoryId);
  if (!cat || cat.status !== "active")
    throw err("Active category not found", 404);
  const product = await Product.create({
    ...data,
    shopId: null,
    sellerId: null,
    source: "pakbazaar",
    isFeatured: false,
    isTrending: false,
    isDeleted: false,
  });
  await safeAudit({
    actor: user,
    action: "NATIVE_PRODUCT_CREATED",
    resourceType: "Product",
    resourceId: product._id,
    newState: product.toObject(),
  });
  return product.toObject();
};
export const updateNativeProduct = async (id, data, user) => {
  if (user?.role !== "super_admin")
    throw err("Only the Super Admin can manage native products", 403);
  if (!oid(id)) throw err("Invalid product ID");
  const p = await Product.findOne({
    _id: id,
    source: "pakbazaar",
    isDeleted: false,
  });
  if (!p) throw err("Native product not found", 404);
  if (data.categoryId) {
    const c = await findCategoryById(data.categoryId);
    if (!c || c.status !== "active")
      throw err("Active category not found", 404);
  }
  const blocked = [
    "sellerId",
    "shopId",
    "source",
    "purchaseCount",
    "averageRating",
    "reviewCount",
    "isFeatured",
    "featuredPriority",
  ];
  blocked.forEach((k) => delete data[k]);
  data.isTrending =
    data.isTrending === undefined ? p.isTrending : Boolean(data.isTrending);
  const updated = await Product.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true },
  ).lean();
  await safeAudit({
    actor: user,
    action: "NATIVE_PRODUCT_UPDATED",
    resourceType: "Product",
    resourceId: id,
    previousState: p,
    newState: updated,
  });
  return updated;
};
export const deleteNativeProduct = async (id, user) => {
  if (user?.role !== "super_admin")
    throw err("Only the Super Admin can manage native products", 403);
  const p = await Product.findOne({
    _id: id,
    source: "pakbazaar",
    isDeleted: false,
  });
  if (!p) throw err("Native product not found", 404);
  const u = await Product.findByIdAndUpdate(
    id,
    { $set: { isDeleted: true, isFeatured: false, isTrending: false } },
    { new: true },
  ).lean();
  await safeAudit({
    actor: user,
    action: "NATIVE_PRODUCT_DELETED",
    resourceType: "Product",
    resourceId: id,
    previousState: p,
    newState: u,
  });
  return u;
};
export const listNativeProducts = async (q = {}) => {
  const page = Number(q.page || 1),
    limit = Math.min(Number(q.limit || 20), 100);
  const filter = { source: "pakbazaar", isDeleted: false };
  if (q.search) filter.$text = { $search: q.search };
  if (q.categoryId) filter.categoryId = q.categoryId;
  if (q.status) filter.status = q.status;
  const sort = {
    [q.sortBy || "createdAt"]: (q.sortOrder || "desc") === "asc" ? 1 : -1,
  };
  const [data, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
