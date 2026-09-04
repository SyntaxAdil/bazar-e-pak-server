// src/modules/category/category.service.js
import {
  createCategory as createCategoryRepository,
  findCategoryById,
  findCategoryBySlug,
  findCategoryByName,
  findCategories,
  countCategories,
  updateCategoryById,
  softDeleteCategoryById,
} from "./category.repository.js";

import Product from "../products/product.model.js";
import { safeAudit } from "../../utils/audit.js";

const createError = (message, statusCode) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

const generateSlug = (name) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

//create category
export const createCategory = async (categoryData, user) => {
  if (user?.role !== "super_admin") {
    throw createError("Only the Super Admin can manage categories", 403);
  }

  const name = categoryData.name.trim();

  const slug = categoryData.slug || generateSlug(name);

  const existingName = await findCategoryByName(name);

  if (existingName) {
    throw createError("A category with this name already exists", 409);
  }

  const existingSlug = await findCategoryBySlug(slug);

  if (existingSlug) {
    throw createError("A category with this slug already exists", 409);
  }

  try {
    const created = await createCategoryRepository({
      ...categoryData,
      name,
      slug,
      createdBy: String(user.id),
    });
    await safeAudit({
      actor: user,
      action: "CATEGORY_CREATED",
      resourceType: "Category",
      resourceId: created._id,
      newState: created,
    });
    return created;
  } catch (error) {
    if (error.code === 11000) {
      throw createError("A category with this information already exists", 409);
    }

    throw error;
  }
};

//get category
export const getCategoryById = async (categoryId) => {
  const category = await findCategoryById(categoryId);

  if (!category) {
    throw createError("Category not found", 404);
  }

  return category;
};

//get category by slug
export const getCategoryBySlug = async (slug) => {
  const category = await findCategoryBySlug(slug.trim().toLowerCase());

  if (!category) {
    throw createError("Category not found", 404);
  }

  return category;
};

//list categories
export const listCategories = async (query) => {
  const { search, status, sortBy, sortOrder, page, limit } = query;

  const filter = {
    isDeleted: false,
  };

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$text = {
      $search: search,
    };
  }

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    findCategories({
      filter,
      skip,
      limit,
      sort,
    }),

    countCategories(filter),
  ]);

  return {
    categories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

//update category
export const updateCategory = async (categoryId, updateData, user) => {
  if (user?.role !== "super_admin") {
    throw createError("Only the Super Admin can manage categories", 403);
  }

  const existingCategory = await findCategoryById(categoryId);

  if (!existingCategory) {
    throw createError("Category not found", 404);
  }

  const updatePayload = {
    ...updateData,
    updatedBy: String(user.id),
  };

  if (updatePayload.name) {
    updatePayload.name = updatePayload.name.trim();

    const existingName = await findCategoryByName(updatePayload.name);

    if (existingName && String(existingName._id) !== String(categoryId)) {
      throw createError("A category with this name already exists", 409);
    }
  }

  if (updatePayload.slug) {
    updatePayload.slug = updatePayload.slug.trim().toLowerCase();

    const existingSlug = await findCategoryBySlug(updatePayload.slug);

    if (existingSlug && String(existingSlug._id) !== String(categoryId)) {
      throw createError("A category with this slug already exists", 409);
    }
  }

  const updated = await updateCategoryById(categoryId, updatePayload);
  await safeAudit({
    actor: user,
    action: "CATEGORY_UPDATED",
    resourceType: "Category",
    resourceId: categoryId,
    previousState: existingCategory,
    newState: updated,
  });
  return updated;
};

//delete category
export const deleteCategory = async (categoryId, user) => {
  if (user?.role !== "super_admin") {
    throw createError("Only the Super Admin can manage categories", 403);
  }

  const category = await findCategoryById(categoryId);

  if (!category) {
    throw createError("Category not found", 404);
  }

  const productCount = await Product.countDocuments({
    categoryId,
    isDeleted: false,
  });

  if (productCount > 0) {
    throw createError(
      `Cannot delete category because ${productCount} product(s) are using it`,
      409,
    );
  }

  const deleted = await softDeleteCategoryById(categoryId);
  await safeAudit({
    actor: user,
    action: "CATEGORY_DELETED",
    resourceType: "Category",
    resourceId: categoryId,
    previousState: category,
    newState: deleted,
  });
  return deleted;
};
