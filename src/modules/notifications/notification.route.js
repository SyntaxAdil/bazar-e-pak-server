import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { listNotifications, markRead } from "./notification.service.js";
const r = Router();
r.get("/", authMiddleware, async (req, res, next) => {
  try {
    res.json({
      success: true,
      ...(await listNotifications(req.user, req.query)),
    });
  } catch (e) {
    next(e);
  }
});
r.patch("/:id/read", authMiddleware, async (req, res, next) => {
  try {
    res.json({ success: true, data: await markRead(req.params.id, req.user) });
  } catch (e) {
    next(e);
  }
});
export default r;
