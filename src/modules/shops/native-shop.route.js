import { Router } from "express";
import Shop from "./shop.model.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { safeAudit } from "../../utils/audit.js";
const r = Router();
const err = (m, c = 400) => Object.assign(new Error(m), { statusCode: c });
r.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1)),
      limit = Math.min(100, Number(req.query.limit || 20));
    const f = { source: "pakbazaar", isDeleted: false };
    if (req.query.search) f.$text = { $search: req.query.search };
    const [data, total] = await Promise.all([
      Shop.find(f)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Shop.countDocuments(f),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
});
r.post(
  "/",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      if (!req.body.name || !req.body.slug)
        throw err("name and slug are required");
      const d = await Shop.create({
        ...req.body,
        sellerId: null,
        source: "pakbazaar",
        status: req.body.status || "active",
      });
      await safeAudit({
        actor: req.user,
        action: "NATIVE_SHOP_CREATED",
        resourceType: "Shop",
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
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const old = await Shop.findOne({
        _id: req.params.id,
        source: "pakbazaar",
        isDeleted: false,
      }).lean();
      if (!old) throw err("Native shop not found", 404);
      const d = { ...req.body };
      delete d.sellerId;
      delete d.source;
      delete d.isDeleted;
      const updated = await Shop.findByIdAndUpdate(
        req.params.id,
        { $set: d },
        { new: true, runValidators: true },
      ).lean();
      await safeAudit({
        actor: req.user,
        action: "NATIVE_SHOP_UPDATED",
        resourceType: "Shop",
        resourceId: req.params.id,
        previousState: old,
        newState: updated,
      });
      res.json({ success: true, data: updated });
    } catch (e) {
      next(e);
    }
  },
);
r.delete(
  "/:id",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const old = await Shop.findOne({
        _id: req.params.id,
        source: "pakbazaar",
        isDeleted: false,
      }).lean();
      if (!old) throw err("Native shop not found", 404);
      const d = await Shop.findByIdAndUpdate(
        req.params.id,
        { $set: { isDeleted: true, status: "inactive" } },
        { new: true },
      ).lean();
      await safeAudit({
        actor: req.user,
        action: "NATIVE_SHOP_DELETED",
        resourceType: "Shop",
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
export default r;
