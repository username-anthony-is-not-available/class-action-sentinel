import { Router } from "express";
import { eq, desc, ilike, or, sql, count } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const { cases, userFlags } = schema;
const router = Router();

// ── GET /api/cases ─────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { search, flag, page = "1", limit = "20" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db
      .select({
        id: cases.id,
        title: cases.title,
        summary: cases.summary,
        status: cases.status,
        settlementAmount: cases.settlementAmount,
        detailUrl: cases.detailUrl,
        courtFileNumber: cases.courtFileNumber,
        scrapedAt: cases.scrapedAt,
        flag: userFlags.flag,
      })
      .from(cases)
      .leftJoin(userFlags, eq(cases.id, userFlags.caseId))
      .orderBy(desc(cases.scrapedAt))
      .limit(Number(limit))
      .offset(offset)
      .$dynamic();

    // Search filter
    if (search && typeof search === "string") {
      query = query.where(
        or(
          ilike(cases.title, `%${search}%`),
          ilike(cases.summary, `%${search}%`),
          ilike(cases.description, `%${search}%`),
        ),
      );
    }

    const results = await query;

    // Total count for pagination
    const [{ total }] = await db.select({ total: count() }).from(cases);

    res.json({
      cases: results,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("[cases] List error:", err);
    res.status(500).json({ error: "Failed to fetch cases" });
  }
});

// ── GET /api/cases/:id ─────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [result] = await db
      .select({
        id: cases.id,
        title: cases.title,
        summary: cases.summary,
        description: cases.description,
        classDefinition: cases.classDefinition,
        status: cases.status,
        settlementAmount: cases.settlementAmount,
        courtFileNumber: cases.courtFileNumber,
        detailUrl: cases.detailUrl,
        deadline: cases.deadline,
        aiAnalysis: cases.aiAnalysis,
        scrapedAt: cases.scrapedAt,
        createdAt: cases.createdAt,
        flag: userFlags.flag,
        flagNotes: userFlags.notes,
      })
      .from(cases)
      .leftJoin(userFlags, eq(cases.id, userFlags.caseId))
      .where(eq(cases.id, id));

    if (!result) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json(result);
  } catch (err) {
    console.error("[cases] Detail error:", err);
    res.status(500).json({ error: "Failed to fetch case" });
  }
});

// ── PATCH /api/cases/:id/flag ──────────────────────────
router.patch("/:id/flag", async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const { flag, notes } = req.body;

    if (!["yes", "no", "unsure"].includes(flag)) {
      return res
        .status(400)
        .json({ error: "Invalid flag value. Use: yes, no, unsure" });
    }

    // Upsert the flag
    const existing = await db
      .select()
      .from(userFlags)
      .where(eq(userFlags.caseId, caseId));

    if (existing.length > 0) {
      await db
        .update(userFlags)
        .set({
          flag,
          notes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(userFlags.caseId, caseId));
    } else {
      await db.insert(userFlags).values({
        caseId,
        flag,
        notes: notes || null,
      });
    }

    res.json({ success: true, caseId, flag });
  } catch (err) {
    console.error("[cases] Flag error:", err);
    res.status(500).json({ error: "Failed to update flag" });
  }
});

export default router;
