import { Router } from "express";
import Campaign from "./campaign.model.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { safeAudit } from "../../utils/audit.js";
const r = Router();
const err = (m, c = 400) => Object.assign(new Error(m), { statusCode: c });
const schema = (b) => {
  if (!b.name || !b.startDate || !b.endDate)
    throw err("name, startDate and endDate are required");
  if (new Date(b.endDate) <= new Date(b.startDate))
    throw err("endDate must be after startDate");
};
r.get("/active", async (req, res, next) => {
  try {
    const now = new Date();
    const data = await Campaign.find({
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ startDate: 1 })
      .lean();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});
r.get(
  "/",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1)),
        limit = Math.min(100, Number(req.query.limit || 20));
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      const [data, total] = await Promise.all([
        Campaign.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Campaign.countDocuments(filter),
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
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      schema(req.body);
      const data = await Campaign.create({
        ...req.body,
        createdBy: String(req.user.id),
      });
      await safeAudit({
        actor: req.user,
        action: "CAMPAIGN_CREATED",
        resourceType: "Campaign",
        resourceId: data._id,
        newState: data.toObject(),
      });
      res.status(201).json({ success: true, data });
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
      schema({
        ...req.body,
        startDate: req.body.startDate || new Date(),
        endDate: req.body.endDate || new Date(Date.now() + 86400000),
        name: req.body.name || "ok",
      });
      const old = await Campaign.findById(req.params.id).lean();
      if (!old) throw err("Campaign not found", 404);
      const data = await Campaign.findByIdAndUpdate(
        req.params.id,
        { $set: { ...req.body, updatedBy: String(req.user.id) } },
        { new: true, runValidators: true },
      ).lean();
      await safeAudit({
        actor: req.user,
        action: "CAMPAIGN_UPDATED",
        resourceType: "Campaign",
        resourceId: req.params.id,
        previousState: old,
        newState: data,
      });
      res.json({ success: true, data });
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
      const old = await Campaign.findByIdAndDelete(req.params.id).lean();
      if (!old) throw err("Campaign not found", 404);
      await safeAudit({
        actor: req.user,
        action: "CAMPAIGN_DELETED",
        resourceType: "Campaign",
        resourceId: req.params.id,
        previousState: old,
      });
      res.json({ success: true, message: "Campaign deleted successfully" });
    } catch (e) {
      next(e);
    }
  },
);
export default r;
