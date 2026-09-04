import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  categorySlugSchema,
  categoryQuerySchema,
} from "./category.validation.js";

import {
  createCategory as createCategoryService,
  getCategoryById,
  getCategoryBySlug,
  listCategories,
  updateCategory as updateCategoryService,
  deleteCategory as deleteCategoryService,
} from "./category.service.js";

export const createCategory = async (req, res, next) => {
  try {
    const validatedData = createCategorySchema.parse(req.body);

    const category = await createCategoryService(validatedData, req.user);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req, res, next) => {
  try {
    const { id } = categoryIdSchema.parse(req.params);

    const category = await getCategoryById(id);

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlugController = async (req, res, next) => {
  try {
    const { slug } = categorySlugSchema.parse(req.params);

    const category = await getCategoryBySlug(slug);

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const query = categoryQuerySchema.parse(req.query);

    const result = await listCategories(query);

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: result.categories,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = categoryIdSchema.parse(req.params);

    const validatedData = updateCategorySchema.parse(req.body);

    const category = await updateCategoryService(id, validatedData, req.user);

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = categoryIdSchema.parse(req.params);

    await deleteCategoryService(id, req.user);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
