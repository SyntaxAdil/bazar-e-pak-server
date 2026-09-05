// src/modules/seller-applications/seller-application.controller.js
import {
  createSellerApplicationSchema,
  sellerApplicationQuerySchema,
  sellerApplicationIdSchema,
  reviewSellerApplicationSchema,
} from "./seller-application.validation.js";

import {
  applySeller,
  getMyApplication,
  getSellerApplications,
  reviewSellerApplication,
} from "./seller-application.service.js";

//apply seller
export const createSellerApplication = async (req, res, next) => {
  try {
    const data = createSellerApplicationSchema.parse(req.body);

    const application = await applySeller(data, req.user);

    return res.status(201).json({
      success: true,
      message: "Seller application submitted successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

//get my application
export const getMySellerApplication = async (req, res, next) => {
  try {
    const application = await getMyApplication(req.user);

    return res.status(200).json({
      success: true,
      message: "Seller application fetched successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

//get applications
export const getApplications = async (req, res, next) => {
  try {
    const query = sellerApplicationQuerySchema.parse(req.query);

    const result = await getSellerApplications(query);

    return res.status(200).json({
      success: true,
      message: "Seller applications fetched successfully",
      data: result.applications,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

//review application
export const reviewApplication = async (req, res, next) => {
  try {
    const { id } = sellerApplicationIdSchema.parse(req.params);

    const data = reviewSellerApplicationSchema.parse(req.body);

    const application = await reviewSellerApplication(id, data, req.user);

    return res.status(200).json({
      success: true,
      message: "Seller application reviewed successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};
