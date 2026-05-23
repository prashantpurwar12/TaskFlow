import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app.js";
import { connectDb } from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ── Validate required environment variables ──────────────────────────────────
const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`[STARTUP] Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (process.env.JWT_SECRET === "change-me-to-a-long-random-secret") {
  console.error("[STARTUP] JWT_SECRET is still set to the default placeholder. Please set a strong random secret.");
  if (process.env.NODE_ENV === "production") process.exit(1);
}

const port = Number(process.env.PORT) || 5000;

// ── Start server ─────────────────────────────────────────────────────────────
connectDb()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`[SERVER] Running on port ${port} (${process.env.NODE_ENV || "development"})`);
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const shutdown = (signal) => {
      console.log(`[SERVER] ${signal} received — shutting down gracefully`);
      server.close(() => {
        console.log("[SERVER] HTTP server closed");
        process.exit(0);
      });
      // Force exit after 10 seconds if connections linger
      setTimeout(() => {
        console.error("[SERVER] Forced exit after timeout");
        process.exit(1);
      }, 10_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((error) => {
    console.error("[SERVER] Failed to start:", error);
    process.exit(1);
  });

// ── Unhandled rejections / exceptions ────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
  process.exit(1);
});
