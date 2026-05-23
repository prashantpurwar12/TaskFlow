import express from "express";
import { protect } from "../middleware/auth.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";

const router = express.Router();

router.get("/", protect, async (req, res, next) => {
  try {
    let baseQuery = {};
    if (req.user.role === "Member") {
      baseQuery = { assignee: req.user._id };
    } else if (req.user.role === "Manager") {
      const managerProjects = await Project.find({ members: req.user._id });
      const projectIds = managerProjects.map((p) => p._id);
      baseQuery = { project: { $in: projectIds } };
    } else {
      baseQuery = {};
    }
    const now = new Date();

    const [tasks, statusCounts, overdueCount] = await Promise.all([
      Task.find(baseQuery)
        .populate("project", "name")
        .populate("assignee", "name email role")
        .sort({ updatedAt: -1 })
        .limit(8),
      Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Task.countDocuments({ ...baseQuery, status: { $ne: "Done" }, dueDate: { $lt: now } })
    ]);

    const byStatus = { Todo: 0, "In Progress": 0, Done: 0 };
    statusCounts.forEach((item) => {
      byStatus[item._id] = item.count;
    });

    res.json({
      totalTasks: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      byStatus,
      overdueCount,
      recentTasks: tasks
    });
  } catch (error) {
    next(error);
  }
});

export default router;
