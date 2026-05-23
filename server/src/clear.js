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

async function clear() {
  try {
    await connectDb();
    console.log("Purging all data from collections...");
    
    const results = await Promise.all([
      Task.deleteMany(),
      Project.deleteMany(),
      User.deleteMany(),
      AuditLog.deleteMany(),
      Comment.deleteMany(),
      Notification.deleteMany()
    ]);
    
    console.log(`Database successfully cleared:`);
    console.log(`- Tasks deleted: ${results[0].deletedCount}`);
    console.log(`- Projects deleted: ${results[1].deletedCount}`);
    console.log(`- Users deleted: ${results[2].deletedCount}`);
    console.log(`- Audit Logs deleted: ${results[3].deletedCount}`);
    console.log(`- Comments deleted: ${results[4].deletedCount}`);
    console.log(`- Notifications deleted: ${results[5].deletedCount}`);
    
    console.log("\nDatabase is now completely blank. Ready for organic signups and real usage!");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  }
}

clear();
