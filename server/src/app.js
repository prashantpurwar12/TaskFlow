import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === "production";

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:5000"];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true
  })
);

// ── Request logging ─────────────────────────────────────────────────────────
app.use(morgan(isProd ? "combined" : "dev"));

// ── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Rate limiters ───────────────────────────────────────────────────────────
// Strict limiter for auth endpoints: 15 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests from this IP, please try again after 15 minutes" }
});

// General API limiter: 300 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down" }
});

// ── Health check (no auth, no rate limit) ───────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV || "development" });
});

// ── API routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/projects", apiLimiter, projectRoutes);
app.use("/api/tasks", apiLimiter, taskRoutes);
app.use("/api/dashboard", apiLimiter, dashboardRoutes);
app.use("/api/audit-logs", apiLimiter, auditRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);

// ── Static client (production) ──────────────────────────────────────────────
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  // Never expose internal error details in production
  if (isProd && status === 500) {
    console.error("[ERROR]", err);
    return res.status(500).json({ message: "An unexpected error occurred. Please try again." });
  }
  if (!isProd) console.error("[ERROR]", err);
  res.status(status).json({ message: err.message || "Server error" });
});

export default app;
