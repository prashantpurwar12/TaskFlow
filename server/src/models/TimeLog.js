import mongoose from "mongoose";

const timeLogSchema = new mongoose.Schema(
  {
    task:     { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    project:  { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    duration: { type: Number, required: true, min: 1 }, // stored in seconds
    note:     { type: String, maxlength: 200, default: "" },
    loggedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Covers: GET /tasks/:id/time  (history sorted by date)
timeLogSchema.index({ task: 1, loggedAt: -1 });
// Covers: project aggregation in GET /projects
timeLogSchema.index({ project: 1 });
// Covers: user time report queries
timeLogSchema.index({ user: 1, loggedAt: -1 });

export default mongoose.model("TimeLog", timeLogSchema);

