import { Router } from "express";
import TeamMember from "./team.model.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { safeAudit } from "../../utils/audit.js";
const r = Router();
r.get("/public", async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await TeamMember.find({ status: "active" })
        .sort({ order: 1 })
        .lean(),
    });
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
      const [data, total] = await Promise.all([
        TeamMember.find({})
          .sort({ order: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        TeamMember.countDocuments(),
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
      const d = await TeamMember.create(req.body);
      await safeAudit({
        actor: req.user,
        action: "TEAM_MEMBER_CREATED",
        resourceType: "TeamMember",
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
      const old = await TeamMember.findById(req.params.id).lean();
      if (!old) {
        const e = new Error("Team member not found");
        e.statusCode = 404;
        throw e;
      }
      const d = await TeamMember.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();
      await safeAudit({
        actor: req.user,
        action: "TEAM_MEMBER_UPDATED",
        resourceType: "TeamMember",
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
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const old = await TeamMember.findByIdAndDelete(req.params.id).lean();
      if (!old) {
        const e = new Error("Team member not found");
        e.statusCode = 404;
        throw e;
      }
      await safeAudit({
        actor: req.user,
        action: "TEAM_MEMBER_DELETED",
        resourceType: "TeamMember",
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
