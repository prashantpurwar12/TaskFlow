import express from "express";
import { protect, requireAdmin } from "../middleware/auth.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();

router.get("/", protect, async (_req, res, next) => {
  try {
    const users = await User.find().select("name email role").sort({ name: 1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/role", protect, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["Admin", "Manager", "Member"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    // Prevent self-demotion
    if (String(req.user._id) === req.params.id) {
      return res.status(400).json({ message: "Admins cannot change their own role to prevent system lockout" });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    // Log the event
    await AuditLog.create({
      action: "Role Changed",
      actor: req.user._id,
      target: targetUser.email,
      details: `${req.user.name} changed role for ${targetUser.name} from ${oldRole} to ${role}.`
    });

    res.json({
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role
    });
  } catch (error) {
    next(error);
  }
});

export default router;
