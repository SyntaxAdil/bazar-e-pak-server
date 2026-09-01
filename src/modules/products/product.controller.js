import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  productQuerySchema,
  productFeatureSchema,
  productTrackingSchema,
  bestSellingQuerySchema,
} from "./product.validation.js";

import {
  createProduct as createProductService,
  getProductById,
  listProducts,
  listSellerProducts,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
  updateProductFeatured,
  trackProductClick,
  getBestSellingProducts,
} from "./product.service.js";

export const createProduct = async (
  req,
  res,
  next,
) => {
  try {
    const validatedData =
      createProductSchema.parse(req.body);

    const product =
      await createProductService(
        validatedData,
        req.user,
      );

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (
  req,
  res,
  next,
) => {
  try {
    const { id } =
      productIdSchema.parse(req.params);

    const product =
      await getProductById(id);

    return res.status(200).json({
      success: true,
      message:
        "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (
  req,
  res,
  next,
) => {
  try {
    const query =
      productQuerySchema.parse(req.query);

    if (req.user?.role === "seller") {
      query.sellerId = String(req.user.id);
    }

    const result =
      await listProducts(query);

    return res.status(200).json({
      success: true,
      message:
        "Products fetched successfully",
      data: result.products,
      pagination:
        result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seller-only product listing.
 */
export const getSellerProducts = async (
  req,
  res,
  next,
) => {
  try {
    const query =
      productQuerySchema.parse(req.query);

    const result =
      await listSellerProducts(
        query,
        req.user,
      );

    return res.status(200).json({
      success: true,
      message:
        "Seller products fetched successfully",
      data: result.products,
      pagination:
        result.pagination,
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
    const { id } =
      productIdSchema.parse(req.params);

    const validatedData =
      updateProductSchema.parse(req.body);

    const product =
      await updateProductService(
        id,
        validatedData,
        req.user,
      );

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully",
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
    const { id } =
      productIdSchema.parse(req.params);

    await deleteProductService(
      id,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message:
        "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const setProductFeatured = async (
  req,
  res,
  next,
) => {
  try {
    const { id } =
      productIdSchema.parse(req.params);

    const { isFeatured } =
      productFeatureSchema.parse(
        req.body,
      );

    const product =
      await updateProductFeatured(
        id,
        isFeatured,
        req.user,
      );

    return res.status(200).json({
      success: true,
      message: isFeatured
        ? "Product marked as featured"
        : "Product removed from featured",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const trackProduct = async (
  req,
  res,
  next,
) => {
  try {
    const { id } =
      productIdSchema.parse(req.params);

    const { type } =
      productTrackingSchema.parse(
        req.body,
      );

    const product =
      await trackProductClick(
        id,
        type,
      );

    return res.status(200).json({
      success: true,
      message:
        "Product interaction tracked successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getBestSelling = async (
  req,
  res,
  next,
) => {
  try {
    const query =
      bestSellingQuerySchema.parse(
        req.query,
      );

    const products =
      await getBestSellingProducts(
        query,
      );

    return res.status(200).json({
      success: true,
      message:
        "Best selling products fetched successfully",
      data: products,
    });
  } catch (error) {
    next(error);
  }
};