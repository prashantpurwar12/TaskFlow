import express from "express";
import { body, param } from "express-validator";
import { protect, requireAdmin, hasRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import Notification from "../models/Notification.js";
import TimeLog from "../models/TimeLog.js";

const router = express.Router();

function projectQueryFor(user) {
  if (user.role === "Admin") return {};
  return { members: user._id };
}

router.get("/", protect, async (req, res, next) => {
  try {
    const projects = await Project.find(projectQueryFor(req.user))
      .populate("owner", "name email role")
      .populate("members", "name email role")
      .sort({ createdAt: -1 });

    const projectIds = projects.map((p) => p._id);

    const [taskCounts, timeTotals] = await Promise.all([
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        {
          $group: {
            _id: "$project",
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "Done"] }, 1, 0] } }
          }
        }
      ]),
      TimeLog.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: "$project", totalSeconds: { $sum: "$duration" } } }
      ])
    ]);

    const statsByProject = new Map(
      taskCounts.map((item) => [String(item._id), { total: item.total, completed: item.completed }])
    );
    const timeByProject = new Map(
      timeTotals.map((item) => [String(item._id), item.totalSeconds])
    );

    res.json(
      projects.map((project) => {
        const stats = statsByProject.get(String(project._id)) || { total: 0, completed: 0 };
        const totalLoggedSeconds = timeByProject.get(String(project._id)) || 0;
        return {
          ...project.toObject(),
          taskCount: stats.total,
          completedCount: stats.completed,
          totalLoggedSeconds
        };
      })
    );
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  hasRole(["Admin", "Manager"]),
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Project name is required"),
    body("description").optional().trim().isLength({ max: 800 }).withMessage("Description is too long"),
    body("members").optional().isArray().withMessage("Members must be a list")
  ],
  validate,
  async (req, res, next) => {
    try {
      const memberIds = Array.from(new Set([...(req.body.members || []), String(req.user._id)]));
      const memberCount = await User.countDocuments({ _id: { $in: memberIds } });
      if (memberCount !== memberIds.length) {
        return res.status(422).json({ message: "One or more selected members do not exist" });
      }

      const project = await Project.create({
        name: req.body.name,
        description: req.body.description,
        owner: req.user._id,
        members: memberIds
      });

      // Log project creation
      await AuditLog.create({
        action: "Project Created",
        actor: req.user._id,
        target: project.name,
        details: `${req.user.name} (${req.user.role}) created project "${project.name}"`
      });

      // Trigger notifications for new members
      const otherMembers = memberIds.filter((id) => String(id) !== String(req.user._id));
      if (otherMembers.length > 0) {
        await Promise.all(
          otherMembers.map((memberId) =>
            Notification.create({
              recipient: memberId,
              sender: req.user._id,
              type: "PROJECT_ADDED",
              message: `You were added to the project workspace "${project.name}" by ${req.user.name}`,
              relatedProject: project._id
            })
          )
        );
      }

      const populated = await project.populate([
        { path: "owner", select: "name email role" },
        { path: "members", select: "name email role" }
      ]);
      res.status(201).json(populated);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/members",
  protect,
  [
    param("id").isMongoId().withMessage("Invalid project id"),
    body("members").isArray({ min: 1 }).withMessage("Choose at least one member")
  ],
  validate,
  async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if user is Admin OR Project Owner (Manager)
      if (req.user.role !== "Admin" && String(project.owner) !== String(req.user._id)) {
        return res.status(403).json({ message: "Only admins or the project manager can manage members" });
      }

      // Ensure the owner/manager is always preserved in the member list
      const managerIdStr = String(project.owner);
      const memberIds = Array.from(new Set([...req.body.members, managerIdStr]));

      const memberCount = await User.countDocuments({ _id: { $in: memberIds } });
      if (memberCount !== memberIds.length) {
        return res.status(422).json({ message: "One or more selected members do not exist" });
      }

      const previousMembers = project.members.map((m) => String(m));

      project.members = memberIds;
      await project.save();

      const newlyAddedMembers = memberIds.filter((id) => !previousMembers.includes(String(id)) && String(id) !== String(req.user._id));
      if (newlyAddedMembers.length > 0) {
        await Promise.all(
          newlyAddedMembers.map((memberId) =>
            Notification.create({
              recipient: memberId,
              sender: req.user._id,
              type: "PROJECT_ADDED",
              message: `You were added to the project workspace "${project.name}" by ${req.user.name}`,
              relatedProject: project._id
            })
          )
        );
      }

      const populated = await project.populate([
        { path: "owner", select: "name email role" },
        { path: "members", select: "name email role" }
      ]);

      // Log project member updates
      await AuditLog.create({
        action: "Project Members Updated",
        actor: req.user._id,
        target: project.name,
        details: `${req.user.name} updated the member list of project "${project.name}"`
      });

      res.json(populated);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Invalid project id")],
  validate,
  async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if user is Admin OR Project Owner (Manager)
      if (
        req.user.role !== "Admin" &&
        (req.user.role !== "Manager" || String(project.owner) !== String(req.user._id))
      ) {
        return res.status(403).json({ message: "Only admins or the project manager can delete this project" });
      }

      // Delete all tasks associated with this project
      await Task.deleteMany({ project: project._id });

      // Delete the project
      await Project.deleteOne({ _id: project._id });

      // Log project deletion
      await AuditLog.create({
        action: "Project Deleted",
        actor: req.user._id,
        target: project.name,
        details: `${req.user.name} (${req.user.role}) deleted project "${project.name}" and all its tasks.`
      });

      res.json({ message: "Project and all associated tasks successfully deleted" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
