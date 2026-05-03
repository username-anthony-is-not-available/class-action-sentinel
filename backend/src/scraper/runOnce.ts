import "dotenv/config";
import { LPCLexAdapter } from "./adapters/lpclex.js";
import { runScrape } from "./engine.js";

// One-shot scrape script for CLI / Docker usage
async function main() {
  console.log("[runOnce] Starting one-time scrape...");
  const adapter = new LPCLexAdapter();
  const result = await runScrape(adapter);
  console.log(
    `[runOnce] Done. Run ID: ${result.runId}, New cases: ${result.newCases}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[runOnce] Fatal error:", err);
  process.exit(1);
});
