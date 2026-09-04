import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import {
  createNativeProduct,
  updateNativeProduct,
  deleteNativeProduct,
  listNativeProducts,
} from "./native-product.js";
const r = Router();
r.get("/", listNativeProducts);
r.post(
  "/",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await createNativeProduct(req.body, req.user),
        });
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
      res.json({
        success: true,
        data: await updateNativeProduct(req.params.id, req.body, req.user),
      });
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
      res.json({
        success: true,
        data: await deleteNativeProduct(req.params.id, req.user),
      });
    } catch (e) {
      next(e);
    }
  },
);
export default r;
