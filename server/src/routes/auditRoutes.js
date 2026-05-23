import express from "express";
import { protect, requireAdmin } from "../middleware/auth.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();

router.get("/", protect, requireAdmin, async (_req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate("actor", "name email role")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;
