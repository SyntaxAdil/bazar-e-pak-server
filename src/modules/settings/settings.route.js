import { Router } from "express";
import PlatformSetting from "./settings.model.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { safeAudit } from "../../utils/audit.js";
const r = Router();
const err = (m, c = 400) => Object.assign(new Error(m), { statusCode: c });
r.get("/public", async (req, res, next) => {
  try {
    const rows = await PlatformSetting.find({
      key: { $in: ["site", "contact", "localization"] },
    }).lean();
    res.json({ success: true, data: rows });
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
      res.json({
        success: true,
        data: await PlatformSetting.find({}).sort({ key: 1 }).lean(),
      });
    } catch (e) {
      next(e);
    }
  },
);
r.put(
  "/:key",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      if (!req.params.key) throw err("Setting key is required");
      const old = await PlatformSetting.findOne({ key: req.params.key }).lean();
      const d = await PlatformSetting.findOneAndUpdate(
        { key: req.params.key },
        {
          $set: {
            value: req.body.value,
            description: req.body.description || "",
            updatedBy: String(req.user.id),
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      ).lean();
      await safeAudit({
        actor: req.user,
        action: "PLATFORM_SETTING_CHANGED",
        resourceType: "PlatformSetting",
        resourceId: req.params.key,
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
