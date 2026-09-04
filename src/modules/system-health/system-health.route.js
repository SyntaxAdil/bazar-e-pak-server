import { Router } from "express";
import mongoose from "mongoose";
import os from "node:os";
import fs from "node:fs";
import authMiddleware from "../../middlewares/auth.middleware.js";
import checkRoleMiddleware from "../../middlewares/role-middleware.js";
import { getMetrics } from "../../utils/system-metrics.js";
const r = Router();
r.get("/", authMiddleware, checkRoleMiddleware("super_admin"), (req, res) => {
  const db = mongoose.connection.readyState === 1;
  const m = getMetrics();
  res.json({
    success: true,
    data: {
      server: "up",
      api: {
        status: "up",
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
      },
      database: {
        status: db ? "up" : "down",
        readyState: mongoose.connection.readyState,
      },
      requests: m.requests,
      errors: m.errors,
      errorRate: m.requests ? Number((m.errors / m.requests).toFixed(4)) : 0,
      authenticationFailures: m.authenticationFailures,
      memory: {
        rss: process.memoryUsage().rss,
        heapUsed: process.memoryUsage().heapUsed,
      },
      cpuLoad: os.loadavg(),
      storage: {
        path: process.cwd(),
        availableBytes: (() => {
          try {
            return (
              fs.statfsSync(process.cwd()).bavail *
              fs.statfsSync(process.cwd()).bsize
            );
          } catch {
            return null;
          }
        })(),
      },
      backgroundJobs: { status: "not_configured" },
    },
  });
});
export default r;
