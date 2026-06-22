# Project Backlog: class-action-sentinel

This document tracks the milestones and tasks for the `class-action-sentinel`
project.

## Milestone 1: Core Infrastructure & Initialization ✅

- [x] Initialize repository with basic structure (Backend, Frontend, DB).
- [x] Implement automated setup script (`setup.sh`).
- [x] Define project vision and objectives (`GOAL.md`).
- [x] Establish project standards (`STANDARDS.md`).
- [x] Configure agent guidelines (`AGENTS.md`).
- [x] Initialize project backlog (`BACKLOG.md`).

## Milestone 2: Data Acquisition (Scrapers)

- [x] Implement base scraper engine.
- [x] Create `SourceAdapter` interface.
- [x] Implement `lpclex.ts` adapter.
- [ ] Implement additional adapters for major class action settlement sites.
- [ ] Implement robust error handling and retries for scraping.
- [ ] Enhance scraper to handle pagination more effectively.

## Milestone 3: Case Analysis & AI Integration

- [x] Integrate OpenAI for basic case detail extraction.
- [ ] Refine AI prompts for better extraction accuracy.
- [ ] Implement cost tracking for AI API usage.
- [ ] Explore local LLM options for cost reduction.

## Milestone 4: User Dashboard & Experience

- [x] Basic Next.js dashboard setup.
- [x] Display list of recent cases.
- [x] Implement "User Flagging" (Impacted, Not for me, Unsure).
- [ ] Enhance dashboard with search and filtering capabilities.
- [ ] Implement case detail view with AI-summarized insights.
- [ ] Add visualization for scrape history and stats.

## Milestone 5: Monitoring & Notifications

- [x] Basic `nodemailer` configuration.
- [ ] Implement automated email alerts for newly discovered cases matching user
  criteria.
- [ ] Add user preference settings for notification frequency and topics.
- [ ] Implement "Tracked Case" updates (notify users when a flagged case's
  status changes).

## Milestone 6: Autonomous Operations & Quality

- [ ] Achieve 80% test coverage for backend core logic.
- [ ] Achieve 80% test coverage for frontend components.
- [ ] Implement E2E tests for critical user flows.
- [ ] Configure Jules/Agents to autonomously pick up and execute tasks from
  this backlog.
- [ ] Implement automated dependency updates and security scanning.
