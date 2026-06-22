import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { SourceAdapter, CaseListItem } from "./types.js";
import {
  sendNewCaseNotification,
  sendTrackedCaseUpdateNotification,
} from "../notifications/emailService.js";
import { Throttler } from "./throttler.js";
import { ProxyManager } from "./proxyManager.js";

const { sources, cases, scrapeRuns, userFlags } = schema;

const MAX_RETRIES = 3;

export async function runScrape(
  adapter: SourceAdapter,
): Promise<{ runId: number; newCases: number }> {
  console.log(`[scraper] Starting scrape for adapter: ${adapter.key}`);

  const throttler = new Throttler();
  const proxyManager = new ProxyManager();

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
    let allListItems: CaseListItem[] = [];
    let listRetryCount = 0;
    let listSuccess = false;

    while (listRetryCount < MAX_RETRIES && !listSuccess) {
      try {
        if (adapter.setProxy && proxyManager.hasProxies()) {
          adapter.setProxy(proxyManager.getNextProxy()!);
        }
        allListItems = await adapter.listCases();
        listSuccess = true;
      } catch (err: any) {
        listRetryCount++;
        console.error(
          `[scraper] ✗ Failed to fetch listing (Attempt ${listRetryCount}):`,
          err.message,
        );
        if (listRetryCount >= MAX_RETRIES) throw err;
        await adapter.cleanup();
        if (process.env.NODE_ENV !== "test") {
          await new Promise((res) => setTimeout(res, 5000 * listRetryCount));
        }
      }
    }

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
    const errors: string[] = [];

    // ── Process all list items ─────────────────────────
    for (const item of allListItems) {
      let retryCount = 0;
      let success = false;

      while (retryCount < MAX_RETRIES && !success) {
        try {
          const isNew = !existingIds.has(item.externalId);
          const tracked = trackedCasesMap.get(item.externalId);

          if (!isNew && !tracked) {
            success = true;
            continue;
          }

          console.log(
            `[scraper] Processing ${isNew ? "new" : "tracked"} case: ${item.title} (Attempt ${retryCount + 1})`,
          );

          // Rotate proxy if needed for retries
          if (retryCount > 0 && adapter.setProxy && proxyManager.hasProxies()) {
            adapter.setProxy(proxyManager.getNextProxy()!);
            await adapter.cleanup(); // Force context recreation with new proxy
          }

          const { detail, statusCode, duration } = await adapter.getCaseDetail(item.url);
          throttler.adjust(statusCode, duration);

          if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
            throw new Error(`HTTP ${statusCode}`);
          }

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

          success = true;
          await throttler.wait();
        } catch (err: any) {
          retryCount++;
          console.error(`[scraper] ✗ Failed to process ${item.title} (Attempt ${retryCount}):`, err.message);
          if (retryCount >= MAX_RETRIES) {
            errors.push(`${item.title}: ${err.message}`);
          } else {
            // Wait longer before retry
            if (process.env.NODE_ENV !== "test") {
              await new Promise((res) => setTimeout(res, 5000 * retryCount));
            }
          }
        }
      }
    }

    // ── Finalize run ───────────────────────────────────
    await db
      .update(scrapeRuns)
      .set({
        status: errors.length === allListItems.length && allListItems.length > 0 ? "failed" : "completed",
        finishedAt: new Date(),
        casesFound: allListItems.length,
        casesNew: processedCount,
        error: errors.length > 0 ? errors.join("; ") : null,
      })
      .where(eq(scrapeRuns.id, run.id));

    await db
      .update(sources)
      .set({
        lastScrapedAt: new Date(),
      })
      .where(eq(sources.id, source.id));

    console.log(
      `[scraper] ✓ Scrape complete. ${processedCount} new cases added. ${errors.length} errors.`,
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
