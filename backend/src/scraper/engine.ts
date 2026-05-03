import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { SourceAdapter, CaseListItem } from "./types.js";

const { sources, cases, scrapeRuns } = schema;

export async function runScrape(
  adapter: SourceAdapter,
): Promise<{ runId: number; newCases: number }> {
  console.log(`[scraper] Starting scrape for adapter: ${adapter.key}`);

  // ── Ensure source exists ────────────────────────────
  let [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.adapterKey, adapter.key));
  if (!source) {
    [source] = await db
      .insert(sources)
      .values({
        name: adapter.key,
        baseUrl: "",
        adapterKey: adapter.key,
      })
      .returning();
  }

  // ── Create scrape run ───────────────────────────────
  const [run] = await db
    .insert(scrapeRuns)
    .values({
      sourceId: source.id,
      status: "running",
    })
    .returning();

  try {
    // ── Fetch listing ──────────────────────────────────
    const allListItems = await adapter.listCases();
    console.log(`[scraper] Found ${allListItems.length} cases on listing`);

    // ── Get existing external IDs ──────────────────────
    const existingCases = await db
      .select({ externalId: cases.externalId })
      .from(cases)
      .where(eq(cases.sourceId, source.id));
    const existingIds = new Set(existingCases.map((c) => c.externalId));

    // ── Filter to new cases only (incremental) ─────────
    const newItems = allListItems.filter(
      (item) => !existingIds.has(item.externalId),
    );
    console.log(`[scraper] ${newItems.length} new cases to process`);

    let processedCount = 0;

    for (const item of newItems) {
      try {
        console.log(`[scraper] Processing: ${item.title}`);
        const detail = await adapter.getCaseDetail(item.url);

        await db.insert(cases).values({
          sourceId: source.id,
          externalId: item.externalId,
          title: detail.title || item.title,
          summary: item.snippet,
          description: detail.description,
          classDefinition: detail.classDefinition,
          status: detail.status,
          settlementAmount: detail.settlementAmount,
          courtFileNumber: detail.courtFileNumber,
          detailUrl: item.url,
          deadline: detail.deadline,
          rawHtml: detail.rawHtml,
          aiAnalysis: detail as any,
        });

        processedCount++;
        console.log(`[scraper] ✓ Saved: ${item.title}`);

        // Small delay between requests to be polite
        await sleep(2000);
      } catch (err) {
        console.error(`[scraper] ✗ Failed to process ${item.title}:`, err);
      }
    }

    // ── Finalize run ───────────────────────────────────
    await db
      .update(scrapeRuns)
      .set({
        status: "completed",
        finishedAt: new Date(),
        casesFound: allListItems.length,
        casesNew: processedCount,
      })
      .where(eq(scrapeRuns.id, run.id));

    await db
      .update(sources)
      .set({
        lastScrapedAt: new Date(),
      })
      .where(eq(sources.id, source.id));

    console.log(
      `[scraper] ✓ Scrape complete. ${processedCount} new cases added.`,
    );
    return { runId: run.id, newCases: processedCount };
  } catch (err: any) {
    await db
      .update(scrapeRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: err.message,
      })
      .where(eq(scrapeRuns.id, run.id));

    console.error("[scraper] ✗ Scrape failed:", err);
    throw err;
  } finally {
    await adapter.cleanup();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
