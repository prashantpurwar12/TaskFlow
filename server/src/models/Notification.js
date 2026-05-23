import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ["PROJECT_ADDED", "TASK_ASSIGNED", "TASK_COMPLETED"]
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project"
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task"
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Covers: GET /notifications (by recipient, sorted by date)
// Covers: unread count (recipient + read flag)
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);
