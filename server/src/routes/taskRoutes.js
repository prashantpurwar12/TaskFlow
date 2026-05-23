import express from "express";
import { body, param } from "express-validator";
import mongoose from "mongoose";
import { protect, requireAdmin, hasRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import AuditLog from "../models/AuditLog.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import TimeLog from "../models/TimeLog.js";

const router = express.Router();

router.get("/", protect, async (req, res, next) => {
  try {
    let filters = {};

    if (req.user.role === "Member") {
      // Members only see tasks assigned to them
      filters = { assignee: req.user._id };
    } else if (req.user.role === "Manager") {
      // Managers see tasks in any project where they are members
      const managerProjects = await Project.find({ members: req.user._id });
      const projectIds = managerProjects.map((p) => p._id);
      filters = { project: { $in: projectIds } };
    } else {
      // Admins see all tasks
      filters = {};
    }

    if (req.query.project && mongoose.Types.ObjectId.isValid(req.query.project)) {
      filters.project = req.query.project;
    }

    const tasks = await Task.find(filters)
      .populate("project", "name")
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role")
      .sort({ dueDate: 1 });

    // Aggregate total logged seconds per task
    const taskIds = tasks.map((t) => t._id);
    const timeTotals = await TimeLog.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", totalSeconds: { $sum: "$duration" } } }
    ]);
    const timeByTask = new Map(timeTotals.map((t) => [String(t._id), t.totalSeconds]));

    const tasksWithTime = tasks.map((task) => ({
      ...task.toObject(),
      totalLoggedSeconds: timeByTask.get(String(task._id)) || 0
    }));

    res.json(tasksWithTime);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  hasRole(["Admin", "Manager"]),
  [
    body("title").trim().isLength({ min: 2 }).withMessage("Task title is required"),
    body("project").isMongoId().withMessage("Valid project is required"),
    body("assignee").isMongoId().withMessage("Valid assignee is required"),
    body("dueDate").isISO8601().withMessage("Valid due date is required"),
    body("priority").optional().isIn(["Low", "Medium", "High"]).withMessage("Invalid priority"),
    body("status").optional().isIn(["Todo", "In Progress", "Done"]).withMessage("Invalid status")
  ],
  validate,
  async (req, res, next) => {
    try {
      const project = await Project.findById(req.body.project);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // If user is a Manager, check if they belong to this project
      if (req.user.role !== "Admin") {
        const isMember = project.members.some((id) => String(id) === String(req.user._id));
        if (!isMember) {
          return res.status(403).json({ message: "You do not have access to add tasks to this project" });
        }
      }

      // Check if the assignee is a member of the project
      const isAssigneeMember = project.members.some((id) => String(id) === req.body.assignee);
      if (!isAssigneeMember) {
        return res.status(422).json({ message: "Assignee must be a member of the project" });
      }

      const task = await Task.create({
        title: req.body.title,
        description: req.body.description,
        project: req.body.project,
        assignee: req.body.assignee,
        createdBy: req.user._id,
        dueDate: req.body.dueDate,
        priority: req.body.priority,
        status: req.body.status
      });

      // Log task creation
      await AuditLog.create({
        action: "Task Created",
        actor: req.user._id,
        target: task.title,
        details: `${req.user.name} created task "${task.title}" in project "${project.name}"`
      });

      // Trigger notification for assignee
      if (String(task.assignee) !== String(req.user._id)) {
        await Notification.create({
          recipient: task.assignee,
          sender: req.user._id,
          type: "TASK_ASSIGNED",
          message: `You were assigned a new task "${task.title}" in project "${project.name}" by ${req.user.name}`,
          relatedProject: project._id,
          relatedTask: task._id
        });
      }

      const populated = await task.populate([
        { path: "project", select: "name" },
        { path: "assignee", select: "name email role" },
        { path: "createdBy", select: "name email role" }
      ]);
      res.status(201).json(populated);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  protect,
  [
    param("id").isMongoId().withMessage("Invalid task id"),
    body("status").optional().isIn(["Todo", "In Progress", "Done"]).withMessage("Invalid status"),
    body("title").optional().trim().isLength({ min: 2 }).withMessage("Task title is required"),
    body("assignee").optional().isMongoId().withMessage("Valid assignee is required"),
    body("dueDate").optional().isISO8601().withMessage("Valid due date is required")
  ],
  validate,
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const project = await Project.findById(task.project);
      if (!project) {
        return res.status(404).json({ message: "Associated project not found" });
      }

      const isProjectMember = project.members.some((id) => String(id) === String(req.user._id));
      const isAssignee = String(task.assignee) === String(req.user._id);

      // Determine permissions
      const canManageDetails = req.user.role === "Admin" || (req.user.role === "Manager" && isProjectMember);
      const canUpdateStatusOnly = isAssignee && isProjectMember;

      if (!canManageDetails && !canUpdateStatusOnly) {
        return res.status(403).json({ message: "You do not have permission to update this task" });
      }

      const previousAssignee = String(task.assignee);
      const previousStatus = task.status;

      // Validate details update fields
      const detailsFields = ["title", "description", "assignee", "dueDate", "priority"];
      for (const field of detailsFields) {
        if (req.body[field] !== undefined) {
          if (!canManageDetails) {
            return res.status(403).json({ message: "Only admins or project managers can edit task details" });
          }
          task[field] = req.body[field];
        }
      }

      if (req.body.assignee && !project.members.some((id) => String(id) === req.body.assignee)) {
        return res.status(422).json({ message: "Assignee must be a member of the project" });
      }

      if (req.body.status !== undefined) {
        task.status = req.body.status;
      }

      await task.save();

      // Trigger notification if assignee changed and the new assignee is not the active user
      if (req.body.assignee !== undefined && String(task.assignee) !== previousAssignee) {
        if (String(task.assignee) !== String(req.user._id)) {
          await Notification.create({
            recipient: task.assignee,
            sender: req.user._id,
            type: "TASK_ASSIGNED",
            message: `You were assigned a new task "${task.title}" in project "${project.name}" by ${req.user.name}`,
            relatedProject: project._id,
            relatedTask: task._id
          });
        }
      }

      // Trigger notification if status changed to Done by a Member for a task created/assigned by a Manager or Admin
      if (
        req.body.status === "Done" &&
        previousStatus !== "Done" &&
        req.user.role === "Member"
      ) {
        const creator = await User.findById(task.createdBy);
        if (creator && (creator.role === "Manager" || creator.role === "Admin")) {
          await Notification.create({
            recipient: task.createdBy,
            sender: req.user._id,
            type: "TASK_COMPLETED",
            message: `Task "${task.title}" has been marked as Done by ${req.user.name}`,
            relatedProject: project._id,
            relatedTask: task._id
          });
        }
      }

      // Log task update
      await AuditLog.create({
        action: "Task Updated",
        actor: req.user._id,
        target: task.title,
        details: `${req.user.name} updated task "${task.title}" (Status: "${task.status}")`
      });

      const populated = await task.populate([
        { path: "project", select: "name" },
        { path: "assignee", select: "name email role" },
        { path: "createdBy", select: "name email role" }
      ]);
      res.json(populated);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Invalid task id")],
  validate,
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const project = await Project.findById(task.project);
      if (!project) {
        return res.status(404).json({ message: "Associated project not found" });
      }

      const isProjectMember = project.members.some((id) => String(id) === String(req.user._id));

      // Check if user is Admin OR Project Manager (who is a member of this project)
      if (req.user.role !== "Admin" && (req.user.role !== "Manager" || !isProjectMember)) {
        return res.status(403).json({ message: "Only admins or project managers can delete tasks" });
      }

      await Task.deleteOne({ _id: task._id });

      // Log task deletion
      await AuditLog.create({
        action: "Task Deleted",
        actor: req.user._id,
        target: task.title,
        details: `${req.user.name} (${req.user.role}) deleted task "${task.title}"`
      });

      res.json({ message: "Task successfully deleted" });
    } catch (error) {
      next(error);
    }
  }
);

// Task comments endpoints
router.get("/:id/comments", protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = await Project.findById(task.project);
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }

    if (req.user.role !== "Admin") {
      const isProjectMember = project.members.some((id) => String(id) === String(req.user._id));
      if (!isProjectMember) {
        return res.status(403).json({ message: "You do not have access to view this task's comments" });
      }
    }

    const comments = await Comment.find({ task: task._id })
      .populate("author", "name email role")
      .sort({ createdAt: 1 }); // Oldest first for chat thread order

    res.json(comments);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/comments",
  protect,
  [body("content").trim().isLength({ min: 1, max: 1000 }).withMessage("Comment content is required")],
  validate,
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const project = await Project.findById(task.project);
      if (!project) {
        return res.status(404).json({ message: "Associated project not found" });
      }

      if (req.user.role !== "Admin") {
        const isProjectMember = project.members.some((id) => String(id) === String(req.user._id));
        if (!isProjectMember) {
          return res.status(403).json({ message: "You do not have access to comment on this task" });
        }
      }

      const comment = await Comment.create({
        task: task._id,
        author: req.user._id,
        content: req.body.content
      });

      // Log in audit log
      await AuditLog.create({
        action: "Task Comment Added",
        actor: req.user._id,
        target: task.title,
        details: `${req.user.name} commented on task "${task.title}": "${req.body.content.slice(0, 40)}${req.body.content.length > 40 ? "..." : ""}"`
      });

      const populated = await comment.populate("author", "name email role");
      res.status(201).json(populated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── Time Tracking Routes ────────────────────────────────────────────────────

// GET /api/tasks/:id/time — fetch all time logs for a task
router.get("/:id/time", protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: "Associated project not found" });

    if (req.user.role !== "Admin") {
      const isProjectMember = project.members.some((id) => String(id) === String(req.user._id));
      if (!isProjectMember) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const logs = await TimeLog.find({ task: task._id })
      .populate("user", "name email role")
      .sort({ loggedAt: -1 });

    const totalSeconds = logs.reduce((sum, l) => sum + l.duration, 0);
    res.json({ logs, totalSeconds });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/time — log a time entry for a task
router.post(
  "/:id/time",
  protect,
  [
    param("id").isMongoId().withMessage("Invalid task id"),
    body("duration").isInt({ min: 1 }).withMessage("Duration must be at least 1 second"),
    body("note").optional().isString().isLength({ max: 200 })
  ],
  validate,
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ message: "Task not found" });

      const project = await Project.findById(task.project);
      if (!project) return res.status(404).json({ message: "Associated project not found" });

      // Members can only log time on tasks assigned to them; Managers/Admins can log on any project task
      if (req.user.role === "Member") {
        const isAssignee = String(task.assignee) === String(req.user._id);
        if (!isAssignee) {
          return res.status(403).json({ message: "Members can only log time on their own assigned tasks" });
        }
      } else if (req.user.role !== "Admin") {
        const isProjectMember = project.members.some((id) => String(id) === String(req.user._id));
        if (!isProjectMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const entry = await TimeLog.create({
        task: task._id,
        project: project._id,
        user: req.user._id,
        duration: req.body.duration,
        note: req.body.note || ""
      });

      const populated = await entry.populate("user", "name email role");
      res.status(201).json(populated);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
