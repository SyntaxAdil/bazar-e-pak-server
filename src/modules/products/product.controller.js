import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  productQuerySchema,
} from "./product.validation.js";

import {
  createProduct as createProductService,
  getProductById,
  listProducts,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
} from "./product.service.js";

export const createProduct = async (req, res, next) => {
  try {
    const validatedData =
      createProductSchema.parse(req.body);

    const product = await createProductService(
      validatedData,
      req.user,
    );

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const { id } = productIdSchema.parse(req.params);

    const product = await getProductById(id);

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const query =
      productQuerySchema.parse(req.query);

    const result = await listProducts(query);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req,
  res,
  next,
) => {
  try {
    const { id } = productIdSchema.parse(req.params);

    const validatedData =
      updateProductSchema.parse(req.body);

    const product = await updateProductService(
      id,
      validatedData,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req,
  res,
  next,
) => {
  try {
    const { id } = productIdSchema.parse(req.params);

    await deleteProductService(
      id,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};