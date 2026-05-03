-- Initialize schema for Class Action Sentinel
-- This runs automatically when PostgreSQL container first starts

-- Create custom enum types
DO $$ BEGIN
    CREATE TYPE user_flag AS ENUM ('yes', 'no', 'unsure');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE scrape_status AS ENUM ('running', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    adapter_key VARCHAR(64) NOT NULL UNIQUE,
    last_scraped_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cases table
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    external_id VARCHAR(256) NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    description TEXT,
    class_definition TEXT,
    status TEXT,
    settlement_amount TEXT,
    court_file_number VARCHAR(128),
    detail_url TEXT NOT NULL,
    deadline TEXT,
    raw_html TEXT,
    ai_analysis JSONB,
    scraped_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User flags table
CREATE TABLE IF NOT EXISTS user_flags (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL UNIQUE REFERENCES cases(id),
    flag user_flag NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Scrape runs table
CREATE TABLE IF NOT EXISTS scrape_runs (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP,
    status scrape_status NOT NULL DEFAULT 'running',
    cases_found INTEGER NOT NULL DEFAULT 0,
    cases_new INTEGER NOT NULL DEFAULT 0,
    error TEXT
);

-- Seed the LPClex source
INSERT INTO sources (name, base_url, adapter_key)
VALUES ('LPC Avocats', 'https://lpclex.com', 'lpclex')
ON CONFLICT (adapter_key) DO NOTHING;
