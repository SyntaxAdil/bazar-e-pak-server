import { Router } from "express";
import ProductOffer from "./offer.model.js";
import Product from "../products/product.model.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { safeAudit } from "../../utils/audit.js";
const r = Router();
const err = (m, c = 400) => Object.assign(new Error(m), { statusCode: c });
const validate = (b) => {
  if (
    !b.productId ||
    b.discountPercent === undefined ||
    !b.startDate ||
    !b.endDate
  )
    throw err("productId, discountPercent, startDate and endDate are required");
  if (Number(b.discountPercent) < 0 || Number(b.discountPercent) > 100)
    throw err("Discount must be between 0 and 100");
  if (new Date(b.endDate) <= new Date(b.startDate))
    throw err("endDate must be after startDate");
};
const canOwn = async (id, u) => {
  const p = await Product.findOne({ _id: id, isDeleted: false }).lean();
  if (!p) throw err("Product not found", 404);
  if (u.role === "seller" && String(p.sellerId) !== String(u.id))
    throw err("You are not allowed to manage this product offer", 403);
  if (u.role !== "seller" && u.role !== "super_admin")
    throw err("Forbidden", 403);
  return p;
};
r.get("/active", async (req, res, next) => {
  try {
    const now = new Date();
    const data = await ProductOffer.find({
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate("productId")
      .lean();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});
r.get(
  "/",
  authMiddleware,
  checkRoleMiddleware(["seller", "super_admin"]),
  async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1)),
        limit = Math.min(100, Number(req.query.limit || 20));
      const f = {};
      if (req.user.role === "seller") f.sellerId = String(req.user.id);
      if (req.query.productId) f.productId = req.query.productId;
      if (req.query.status) f.status = req.query.status;
      const [data, total] = await Promise.all([
        ProductOffer.find(f)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("productId")
          .lean(),
        ProductOffer.countDocuments(f),
      ]);
      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);
r.post(
  "/",
  authMiddleware,
  checkRoleMiddleware(["seller", "super_admin"]),
  async (req, res, next) => {
    try {
      validate(req.body);
      const p = await canOwn(req.body.productId, req.user);
      const d = await ProductOffer.create({
        ...req.body,
        sellerId: String(p.sellerId || req.user.id),
        createdBy: String(req.user.id),
      });
      await safeAudit({
        actor: req.user,
        action: "PRODUCT_OFFER_CREATED",
        resourceType: "ProductOffer",
        resourceId: d._id,
        newState: d.toObject(),
      });
      res.status(201).json({ success: true, data: d });
    } catch (e) {
      next(e);
    }
  },
);
r.patch(
  "/:id",
  authMiddleware,
  checkRoleMiddleware(["seller", "super_admin"]),
  async (req, res, next) => {
    try {
      const old = await ProductOffer.findById(req.params.id).lean();
      if (!old) throw err("Offer not found", 404);
      if (
        req.user.role === "seller" &&
        String(old.sellerId) !== String(req.user.id)
      )
        throw err("Forbidden", 403);
      validate({ ...old, ...req.body });
      const d = await ProductOffer.findByIdAndUpdate(
        req.params.id,
        { $set: { ...req.body, updatedBy: String(req.user.id) } },
        { new: true, runValidators: true },
      ).lean();
      await safeAudit({
        actor: req.user,
        action: "PRODUCT_OFFER_UPDATED",
        resourceType: "ProductOffer",
        resourceId: req.params.id,
        previousState: old,
        newState: d,
      });
      res.json({ success: true, data: d });
    } catch (e) {
      next(e);
    }
  },
);
r.delete(
  "/:id",
  authMiddleware,
  checkRoleMiddleware(["seller", "super_admin"]),
  async (req, res, next) => {
    try {
      const old = await ProductOffer.findById(req.params.id).lean();
      if (!old) throw err("Offer not found", 404);
      if (
        req.user.role === "seller" &&
        String(old.sellerId) !== String(req.user.id)
      )
        throw err("Forbidden", 403);
      await ProductOffer.findByIdAndDelete(req.params.id);
      await safeAudit({
        actor: req.user,
        action: "PRODUCT_OFFER_DELETED",
        resourceType: "ProductOffer",
        resourceId: req.params.id,
        previousState: old,
      });
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);
export default r;
