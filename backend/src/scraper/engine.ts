import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { SourceAdapter, CaseListItem, CaseDetail } from "./types.js";
import {
  sendNewCaseNotification,
  sendTrackedCaseUpdateNotification,
} from "../notifications/emailService.js";

const { sources, cases, scrapeRuns, userFlags } = schema;

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

    // ── Get existing cases and tracked status ──────────
    const dbCases = await db
      .select({
        id: cases.id,
        externalId: cases.externalId,
        title: cases.title,
        status: cases.status,
        deadline: cases.deadline,
        settlementAmount: cases.settlementAmount,
        flag: userFlags.flag,
      })
      .from(cases)
      .leftJoin(userFlags, eq(cases.id, userFlags.caseId))
      .where(eq(cases.sourceId, source.id));

    const existingIds = new Set(dbCases.map((c) => c.externalId));
    const trackedCasesMap = new Map(
      dbCases
        .filter((c) => c.flag === "yes" || c.flag === "unsure")
        .map((c) => [c.externalId, c]),
    );

    let processedCount = 0;

    // ── Process all list items ─────────────────────────
    for (const item of allListItems) {
      try {
        const isNew = !existingIds.has(item.externalId);
        const tracked = trackedCasesMap.get(item.externalId);

        if (!isNew && !tracked) continue;

        console.log(
          `[scraper] Processing ${isNew ? "new" : "tracked"} case: ${item.title}`,
        );
        const detail = await adapter.getCaseDetail(item.url);

        if (isNew) {
          const [inserted] = await db
            .insert(cases)
            .values({
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
              lastNotifiedAt: new Date(),
            })
            .returning();

          processedCount++;
          console.log(`[scraper] ✓ Saved: ${item.title}`);

          await sendNewCaseNotification({
            title: inserted.title,
            status: inserted.status,
            settlementAmount: inserted.settlementAmount,
            deadline: inserted.deadline,
            detailUrl: inserted.detailUrl,
          });
        } else if (tracked) {
          const changes: string[] = [];
          if (detail.status !== tracked.status)
            changes.push(`Status changed from "${tracked.status}" to "${detail.status}"`);
          if (detail.deadline !== tracked.deadline)
            changes.push(`Deadline changed from "${tracked.deadline}" to "${detail.deadline}"`);
          if (detail.settlementAmount !== tracked.settlementAmount)
            changes.push(
              `Settlement Amount changed from "${tracked.settlementAmount}" to "${detail.settlementAmount}"`,
            );

          if (changes.length > 0) {
            console.log(`[scraper] ⚠ Detected changes for tracked case: ${item.title}`);
            await db
              .update(cases)
              .set({
                status: detail.status,
                deadline: detail.deadline,
                settlementAmount: detail.settlementAmount,
                description: detail.description,
                classDefinition: detail.classDefinition,
                rawHtml: detail.rawHtml,
                aiAnalysis: detail as any,
                lastNotifiedAt: new Date(),
              })
              .where(eq(cases.id, tracked.id));

            await sendTrackedCaseUpdateNotification(
              {
                title: tracked.title,
                status: detail.status,
                settlementAmount: detail.settlementAmount,
                deadline: detail.deadline,
                detailUrl: item.url,
              },
              changes,
            );
          }
        }

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
