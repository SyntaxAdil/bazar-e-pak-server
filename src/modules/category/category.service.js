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

const createError = (
  message,
  statusCode,
) => {
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

export const createCategory = async (
  categoryData,
  user,
) => {
  if (!user?.id) {
    throw createError(
      "Authenticated user information is required",
      401,
    );
  }

  const name = categoryData.name.trim();

  const slug =
    categoryData.slug ||
    generateSlug(name);

  const existingName =
    await findCategoryByName(name);

  if (existingName) {
    throw createError(
      "A category with this name already exists",
      409,
    );
  }

  const existingSlug =
    await findCategoryBySlug(slug);

  if (existingSlug) {
    throw createError(
      "A category with this slug already exists",
      409,
    );
  }

  const category =
    await createCategoryRepository({
      ...categoryData,

      name,

      slug,

      createdBy: user.id,
    });

  return category;
};

export const getCategoryById = async (
  categoryId,
) => {
  const category =
    await findCategoryById(categoryId);

  if (!category) {
    throw createError(
      "Category not found",
      404,
    );
  }

  return category;
};

export const getCategoryBySlug = async (
  slug,
) => {
  const normalizedSlug =
    slug.trim().toLowerCase();

  const category =
    await findCategoryBySlug(
      normalizedSlug,
    );

  if (!category) {
    throw createError(
      "Category not found",
      404,
    );
  }

  return category;
};

export const listCategories = async (
  query,
) => {
  const {
    search,
    status,
    page,
    limit,
  } = query;

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

  const skip = (page - 1) * limit;

  const [
    categories,
    total,
  ] = await Promise.all([
    findCategories({
      filter,
      skip,
      limit,
    }),

    countCategories(filter),
  ]);

  return {
    categories,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit,
      ),
    },
  };
};

export const updateCategory = async (
  categoryId,
  updateData,
  user,
) => {
  if (!user?.id) {
    throw createError(
      "Authenticated user information is required",
      401,
    );
  }

  const existingCategory =
    await findCategoryById(categoryId);

  if (!existingCategory) {
    throw createError(
      "Category not found",
      404,
    );
  }

  const updatePayload = {
    ...updateData,

    updatedBy: user.id,
  };

  if (updatePayload.name) {
    updatePayload.name =
      updatePayload.name.trim();

    const existingName =
      await findCategoryByName(
        updatePayload.name,
      );

    if (
      existingName &&
      existingName._id.toString() !==
        categoryId
    ) {
      throw createError(
        "A category with this name already exists",
        409,
      );
    }
  }

  if (updatePayload.slug) {
    updatePayload.slug =
      updatePayload.slug
        .trim()
        .toLowerCase();

    const existingSlug =
      await findCategoryBySlug(
        updatePayload.slug,
      );

    if (
      existingSlug &&
      existingSlug._id.toString() !==
        categoryId
    ) {
      throw createError(
        "A category with this slug already exists",
        409,
      );
    }
  }

  const category =
    await updateCategoryById(
      categoryId,
      updatePayload,
    );

  if (!category) {
    throw createError(
      "Category not found",
      404,
    );
  }

  return category;
};

export const deleteCategory = async (
  categoryId,
  user,
) => {
  if (!user?.id) {
    throw createError(
      "Authenticated user information is required",
      401,
    );
  }

  const existingCategory =
    await findCategoryById(categoryId);

  if (!existingCategory) {
    throw createError(
      "Category not found",
      404,
    );
  }

  const productCount =
    await Product.countDocuments({
      categoryId,
      isDeleted: false,
    });

  if (productCount > 0) {
    throw createError(
      `Cannot delete category because ${productCount} product(s) are using it`,
      409,
    );
  }

  const deletedCategory =
    await softDeleteCategoryById(
      categoryId,
    );

  if (!deletedCategory) {
    throw createError(
      "Category not found",
      404,
    );
  }

  return deletedCategory;
};