import "dotenv/config";
import express from "express";
import cors from "cors";
import casesRouter from "./routes/cases.js";
import dashboardRouter from "./routes/dashboard.js";
import { startScheduler } from "./scraper/scheduler.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────
app.use("/api/cases", casesRouter);
app.use("/api/dashboard", dashboardRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start ──────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] Class Action Sentinel API running on port ${PORT}`);
  startScheduler();
});
