CREATE TYPE "public"."user_flag" AS ENUM('yes', 'no', 'unsure');--> statement-breakpoint
CREATE TYPE "public"."scrape_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"external_id" varchar(256) NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"description" text,
	"class_definition" text,
	"status" text,
	"settlement_amount" text,
	"court_file_number" varchar(128),
	"detail_url" text NOT NULL,
	"deadline" text,
	"raw_html" text,
	"ai_analysis" jsonb,
	"last_notified_at" timestamp,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"status" "scrape_status" DEFAULT 'running' NOT NULL,
	"cases_found" integer DEFAULT 0 NOT NULL,
	"cases_new" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"adapter_key" varchar(64) NOT NULL,
	"last_scraped_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sources_adapter_key_unique" UNIQUE("adapter_key")
);
--> statement-breakpoint
CREATE TABLE "user_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"flag" "user_flag" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_flags_case_id_unique" UNIQUE("case_id")
);
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_flags" ADD CONSTRAINT "user_flags_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;