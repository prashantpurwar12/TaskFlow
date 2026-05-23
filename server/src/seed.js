import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDb } from "./config/db.js";
import Project from "./models/Project.js";
import Task from "./models/Task.js";
import User from "./models/User.js";
import AuditLog from "./models/AuditLog.js";
import Comment from "./models/Comment.js";
import Notification from "./models/Notification.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function seed() {
  await connectDb();
  await Promise.all([
    Task.deleteMany(),
    Project.deleteMany(),
    User.deleteMany(),
    AuditLog.deleteMany(),
    Comment.deleteMany(),
    Notification.deleteMany()
  ]);

  const [admin, manager, member] = await User.create([
    {
      name: "Aarav Admin",
      email: "admin@example.com",
      password: "Password123!",
      role: "Admin"
    },
    {
      name: "Meera Manager",
      email: "manager@example.com",
      password: "Password123!",
      role: "Manager"
    },
    {
      name: "Maya Member",
      email: "member@example.com",
      password: "Password123!",
      role: "Member"
    }
  ]);

  // Project 1: Website Redesign (Owner: Admin, members: all)
  const project1 = await Project.create({
    name: "Website Redesign",
    description: "Refreshed landing pages and dashboard to elevate conversion metrics.",
    owner: admin._id,
    members: [admin._id, manager._id, member._id]
  });

  // Project 2: Mobile Application (Owner: Manager, members: Manager + Member)
  const project2 = await Project.create({
    name: "Mobile Application",
    description: "Develop the cross-platform React Native client app.",
    owner: manager._id,
    members: [manager._id, member._id]
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  await Task.create([
    {
      title: "Design main layout & wireframe",
      description: "Draft structural dashboard components for review.",
      project: project1._id,
      assignee: member._id,
      createdBy: admin._id,
      dueDate: tomorrow,
      priority: "High",
      status: "In Progress"
    },
    {
      title: "Launch accessibility audit",
      description: "Verify contrast levels, screen reader compatibility, and HTML semantics.",
      project: project1._id,
      assignee: admin._id,
      createdBy: admin._id,
      dueDate: yesterday,
      priority: "Medium",
      status: "Todo"
    },
    {
      title: "Setup API routes and schemas",
      description: "Define Express route endpoints and DB models for the mobile app.",
      project: project2._id,
      assignee: manager._id,
      createdBy: manager._id,
      dueDate: tomorrow,
      priority: "High",
      status: "In Progress"
    },
    {
      title: "Write push notification service",
      description: "Integrate Firebase Cloud Messaging for app alerts.",
      project: project2._id,
      assignee: member._id,
      createdBy: manager._id,
      dueDate: nextWeek,
      priority: "Medium",
      status: "Todo"
    }
  ]);

  // Create initial audit log records
  await AuditLog.create([
    {
      action: "System Initialized",
      actor: admin._id,
      target: "System",
      details: "Seed script run successfully, database initialized with standard RBAC settings."
    },
    {
      action: "Project Created",
      actor: admin._id,
      target: "Website Redesign",
      details: "Website Redesign project successfully established under Administrative ownership."
    },
    {
      action: "Project Created",
      actor: manager._id,
      target: "Mobile Application",
      details: "Meera Manager created the Mobile Application project workspace."
    }
  ]);

  console.log("Seed data created successfully");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
