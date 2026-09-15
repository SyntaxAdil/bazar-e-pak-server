import { Router } from "express";
import CmsContent from "./cms.model.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { safeAudit } from "../../utils/audit.js";

const r = Router();

const err = (m, c = 400) =>
  Object.assign(new Error(m), { statusCode: c });


// PUBLIC - published CMS content
r.get("/public", async (req, res, next) => {
  try {
    const now = new Date();

    const filter = {
      status: "published",
    };

    if (req.query.locale) {
      filter.locale = req.query.locale;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    filter.$and = [
      {
        $or: [
          { startDate: null },
          { startDate: { $lte: now } },
        ],
      },
      {
        $or: [
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      },
    ];

    const data = await CmsContent.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data,
    });
  } catch (e) {
    next(e);
  }
});


// SUPER ADMIN - list CMS content
r.get(
  "/",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const page = Math.max(
        1,
        Number(req.query.page || 1),
      );

      const limit = Math.min(
        100,
        Number(req.query.limit || 20),
      );

      const filter = {};

      for (const k of [
        "type",
        "status",
        "locale",
        "key",
      ]) {
        if (req.query[k]) {
          filter[k] = req.query[k];
        }
      }

      const [data, total] =
        await Promise.all([
          CmsContent.find(filter)
            .sort({
              order: 1,
              createdAt: -1,
            })
            .skip(
              (page - 1) * limit,
            )
            .limit(limit)
            .lean(),

          CmsContent.countDocuments(
            filter,
          ),
        ]);

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.ceil(
              total / limit,
            ),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);


// SUPER ADMIN - get single CMS content
// IMPORTANT: keep this after /public
r.get(
  "/:id",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const data =
        await CmsContent.findById(
          req.params.id,
        ).lean();

      if (!data) {
        throw err(
          "CMS content not found",
          404,
        );
      }

      res.json({
        success: true,
        data,
      });
    } catch (e) {
      next(e);
    }
  },
);


// SUPER ADMIN - create CMS content
r.post(
  "/",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      if (
        !req.body.key ||
        !req.body.type
      ) {
        throw err(
          "key and type are required",
        );
      }

      const data =
        await CmsContent.create({
          ...req.body,
          createdBy: String(
            req.user.id,
          ),
        });

      await safeAudit({
        actor: req.user,
        action: "CMS_CREATED",
        resourceType:
          "CmsContent",
        resourceId:
          data._id,
        newState:
          data.toObject(),
      });

      res.status(201).json({
        success: true,
        data,
      });
    } catch (e) {
      next(e);
    }
  },
);


// SUPER ADMIN - update CMS content
r.patch(
  "/:id",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const old =
        await CmsContent.findById(
          req.params.id,
        ).lean();

      if (!old) {
        throw err(
          "CMS content not found",
          404,
        );
      }

      const data =
        await CmsContent.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              ...req.body,
              updatedBy: String(
                req.user.id,
              ),
            },
          },
          {
            returnDocument:
              "after",
            runValidators: true,
          },
        ).lean();

      await safeAudit({
        actor: req.user,
        action: "CMS_UPDATED",
        resourceType:
          "CmsContent",
        resourceId:
          req.params.id,
        previousState: old,
        newState: data,
      });

      res.json({
        success: true,
        data,
      });
    } catch (e) {
      next(e);
    }
  },
);


// SUPER ADMIN - delete CMS content
r.delete(
  "/:id",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const old =
        await CmsContent.findByIdAndDelete(
          req.params.id,
        ).lean();

      if (!old) {
        throw err(
          "CMS content not found",
          404,
        );
      }

      await safeAudit({
        actor: req.user,
        action: "CMS_DELETED",
        resourceType:
          "CmsContent",
        resourceId:
          req.params.id,
        previousState: old,
      });

      res.json({
        success: true,
      });
    } catch (e) {
      next(e);
    }
  },
);

export default r;