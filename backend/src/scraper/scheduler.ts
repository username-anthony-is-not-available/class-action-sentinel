import cron from "node-cron";
import { LPCLexAdapter } from "./adapters/lpclex.js";
import { runScrape } from "./engine.js";

const schedule = process.env.SCRAPE_SCHEDULE || "0 3 1 * *"; // Default: 1st of month, 3 AM

export function startScheduler() {
  console.log(`[scheduler] Scrape scheduled: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log("[scheduler] Triggered scheduled scrape");
    try {
      const adapter = new LPCLexAdapter();
      await runScrape(adapter);
    } catch (err) {
      console.error("[scheduler] Scheduled scrape failed:", err);
    }
  });
}

export async function triggerManualScrape() {
  console.log("[scheduler] Manual scrape triggered");
  const adapter = new LPCLexAdapter();
  return runScrape(adapter);
}
