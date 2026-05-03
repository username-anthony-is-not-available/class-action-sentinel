import { Router } from "express";
import { eq, count, desc, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { triggerManualScrape } from "../scraper/scheduler.js";

const { cases, userFlags, scrapeRuns } = schema;
const router = Router();

// ── GET /api/dashboard/stats ───────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [{ total }] = await db.select({ total: count() }).from(cases);

    // Count by flag status
    const flagCounts = await db
      .select({
        flag: userFlags.flag,
        count: count(),
      })
      .from(userFlags)
      .groupBy(userFlags.flag);

    const flags = {
      yes: 0,
      no: 0,
      unsure: 0,
      unflagged: 0,
    };

    for (const fc of flagCounts) {
      if (fc.flag in flags) {
        flags[fc.flag as keyof typeof flags] = fc.count;
      }
    }
    flags.unflagged = total - (flags.yes + flags.no + flags.unsure);

    // Recent cases
    const recentCases = await db
      .select({
        id: cases.id,
        title: cases.title,
        status: cases.status,
        scrapedAt: cases.scrapedAt,
      })
      .from(cases)
      .orderBy(desc(cases.scrapedAt))
      .limit(5);

    res.json({ totalCases: total, flags, recentCases });
  } catch (err) {
    console.error("[dashboard] Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ── GET /api/scrape-runs ───────────────────────────────
router.get("/scrape-runs", async (_req, res) => {
  try {
    const runs = await db
      .select()
      .from(scrapeRuns)
      .orderBy(desc(scrapeRuns.startedAt))
      .limit(20);

    res.json(runs);
  } catch (err) {
    console.error("[dashboard] Scrape runs error:", err);
    res.status(500).json({ error: "Failed to fetch scrape runs" });
  }
});

// ── POST /api/scrape/trigger ───────────────────────────
router.post("/scrape/trigger", async (_req, res) => {
  try {
    // Fire and forget — respond immediately
    res.json({ message: "Scrape triggered", status: "running" });
    triggerManualScrape().catch((err) =>
      console.error("[dashboard] Manual scrape error:", err),
    );
  } catch (err) {
    console.error("[dashboard] Trigger error:", err);
    res.status(500).json({ error: "Failed to trigger scrape" });
  }
});

export default router;
