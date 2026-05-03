import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────
export const flagEnum = pgEnum("user_flag", ["yes", "no", "unsure"]);
export const scrapeStatusEnum = pgEnum("scrape_status", [
  "running",
  "completed",
  "failed",
]);

// ── Sources ────────────────────────────────────────────
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  adapterKey: varchar("adapter_key", { length: 64 }).notNull().unique(),
  lastScrapedAt: timestamp("last_scraped_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Cases ──────────────────────────────────────────────
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id")
    .references(() => sources.id)
    .notNull(),
  externalId: varchar("external_id", { length: 256 }).notNull(), // slug or unique key
  title: text("title").notNull(),
  summary: text("summary"), // short blurb from listing
  description: text("description"), // full case description
  classDefinition: text("class_definition"), // who is eligible
  status: text("status"), // case status text
  settlementAmount: text("settlement_amount"), // raw text ("$500 million")
  courtFileNumber: varchar("court_file_number", { length: 128 }),
  detailUrl: text("detail_url").notNull(),
  deadline: text("deadline"),
  rawHtml: text("raw_html"), // preserved for re-analysis
  aiAnalysis: jsonb("ai_analysis"), // full structured AI output
  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── User Flags ─────────────────────────────────────────
export const userFlags = pgTable("user_flags", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .references(() => cases.id)
    .notNull()
    .unique(),
  flag: flagEnum("flag").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Scrape Runs ────────────────────────────────────────
export const scrapeRuns = pgTable("scrape_runs", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id")
    .references(() => sources.id)
    .notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  status: scrapeStatusEnum("status").default("running").notNull(),
  casesFound: integer("cases_found").default(0).notNull(),
  casesNew: integer("cases_new").default(0).notNull(),
  error: text("error"),
});

// ── Type exports ───────────────────────────────────────
export type Source = typeof sources.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type UserFlag = typeof userFlags.$inferSelect;
export type ScrapeRun = typeof scrapeRuns.$inferSelect;
