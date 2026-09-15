import { Router } from "express";
import Campaign from "./campaign.model.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { safeAudit } from "../../utils/audit.js";

const r = Router();

const err = (m, c = 400) =>
  Object.assign(new Error(m), {
    statusCode: c,
  });

const validateCampaign = (b) => {
  if (!b.name || !b.startDate || !b.endDate) {
    throw err(
      "name, startDate and endDate are required",
    );
  }

  const startDate = new Date(b.startDate);
  const endDate = new Date(b.endDate);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    throw err("Invalid campaign date");
  }

  if (endDate <= startDate) {
    throw err(
      "endDate must be after startDate",
    );
  }

  if (
    b.discountPercent !== null &&
    b.discountPercent !== undefined
  ) {
    const discount = Number(
      b.discountPercent,
    );

    if (
      Number.isNaN(discount) ||
      discount < 0 ||
      discount > 100
    ) {
      throw err(
        "Discount must be between 0 and 100",
      );
    }
  }
};


// PUBLIC - get active campaigns
r.get(
  "/active",
  async (req, res, next) => {
    try {
      const now = new Date();

      const data = await Campaign.find({
        status: "active",
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .sort({ startDate: 1 })
        .lean();

      res.json({
        success: true,
        data,
      });
    } catch (e) {
      next(e);
    }
  },
);


// SUPER ADMIN - get all campaigns
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

      if (req.query.status) {
        filter.status = req.query.status;
      }

      const [data, total] =
        await Promise.all([
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
          totalPages:
            Math.ceil(total / limit),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);


// SUPER ADMIN - get one campaign by ID
r.get(
  "/:id",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const data =
        await Campaign.findById(
          req.params.id,
        ).lean();

      if (!data) {
        throw err(
          "Campaign not found",
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


// SUPER ADMIN - create campaign
r.post(
  "/",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      validateCampaign(req.body);

      const data =
        await Campaign.create({
          ...req.body,
          createdBy: String(
            req.user.id,
          ),
        });

      await safeAudit({
        actor: req.user,
        action:
          "CAMPAIGN_CREATED",
        resourceType:
          "Campaign",
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


// SUPER ADMIN - update campaign
r.patch(
  "/:id",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const old =
        await Campaign.findById(
          req.params.id,
        ).lean();

      if (!old) {
        throw err(
          "Campaign not found",
          404,
        );
      }

      const merged = {
        ...old,
        ...req.body,
      };

      validateCampaign(merged);

      const data =
        await Campaign.findByIdAndUpdate(
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
        action:
          "CAMPAIGN_UPDATED",
        resourceType:
          "Campaign",
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


// SUPER ADMIN - delete campaign
r.delete(
  "/:id",
  authMiddleware,
  checkRoleMiddleware("super_admin"),
  async (req, res, next) => {
    try {
      const old =
        await Campaign.findByIdAndDelete(
          req.params.id,
        ).lean();

      if (!old) {
        throw err(
          "Campaign not found",
          404,
        );
      }

      await safeAudit({
        actor: req.user,
        action:
          "CAMPAIGN_DELETED",
        resourceType:
          "Campaign",
        resourceId:
          req.params.id,
        previousState: old,
      });

      res.json({
        success: true,
        message:
          "Campaign deleted successfully",
      });
    } catch (e) {
      next(e);
    }
  },
);

export default r;