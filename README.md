# Class Action Sentinel ⚖️

A Docker-based system that tracks class action settlements, uses AI to analyze case details, and lets you flag which ones you may be eligible for.

## Getting Started

To set up the project environment, run the following command from the root directory:

```bash
./setup.sh
```

This script will check for prerequisites (Docker, Node.js, npm), set up your environment files, and install necessary dependencies.

## Quick Start (Manual)

```bash
# 1. Create .env from template
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 2. Launch everything
docker compose up --build -d

# 3. Open the dashboard
# http://localhost:8080

# 4. Trigger an initial scrape from the dashboard, or:
docker compose exec backend npx tsx src/scraper/runOnce.ts
```

## Architecture

| Service        | Port | Description                  |
| -------------- | ---- | ---------------------------- |
| **Frontend**   | 8080 | React dashboard (nginx)      |
| **Backend**    | 3001 | Express API + scraper engine |
| **PostgreSQL** | 5432 | Data persistence             |

## Features

- **AI-powered scraping** — Puppeteer navigates settlement pages, OpenAI extracts structured data
- **Incremental updates** — Only processes new cases each run
- **Monthly auto-scrape** — Cron schedule (configurable via `SCRAPE_SCHEDULE`)
- **User flagging** — Mark cases as "I'm impacted", "Not for me", or "Unsure"
- **Tracking dashboard** — Stats, recent cases, scrape history
- **Pluggable sources** — Add new websites by implementing the `SourceAdapter` interface

## Documentation for Agents

If you are an AI agent working on this project, please refer to the [AGENTS.md](AGENTS.md) file for domain boundaries, general instructions, and programmatic checks.

## Adding a New Source

1. Create `backend/src/scraper/adapters/mysite.ts`
2. Implement the `SourceAdapter` interface (`listCases`, `getCaseDetail`, `cleanup`)
3. Register it in the scheduler
4. Add a row to the `sources` table

## Environment Variables

| Variable          | Description                      | Default                          |
| ----------------- | -------------------------------- | -------------------------------- |
| `OPENAI_API_KEY`  | OpenAI API key for case analysis | required                         |
| `DATABASE_URL`    | PostgreSQL connection string     | auto-set in Docker               |
| `SCRAPE_SCHEDULE` | Cron expression for auto-scrape  | `0 3 1 * *` (1st of month, 3 AM) |
| `PORT`            | Backend port                     | `3001`                           |
