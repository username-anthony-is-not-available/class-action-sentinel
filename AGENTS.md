# Agent Instructions

This document provides guidance for AI agents working on the
`class-action-sentinel` project. It defines domain boundaries, general
instructions, and programmatic checks to ensure alignment with the project's
vision and standards.

## Domain Boundaries

Agents should focus on tasks that advance the functional aspects of the
`class-action-sentinel` project:

- **Data Ingestion and Parsing**: Developing and refining systems that ingest
  and parse legal data, including court filings and legal notices.
- **Monitoring and Alerting**: Implementing systems to monitor court filings and
  send alerts based on predefined criteria.
- **Case Tracking**: Building tools to track the progress of class-action cases.
- **Documentation**: Maintaining and updating project documentation, including
  `README.md`, `GOAL.md`, and `STANDARDS.md`.

## General Instructions

All agents must adhere to the project standards defined in `STANDARDS.md`:

- **Code Quality**: Ensure all code passes linting (`eslint`, `markdownlint`) and
  is formatted correctly (`prettier`).
- **Testing**: Maintain a minimum of 80% test coverage for new code. All
  existing tests must pass.
- **Security**: Never commit secrets or sensitive data. Follow best practices
  for data protection and dependency management.
- **Review**: Perform self-reviews and ensure all changes are well-documented.

## Programmatic Checks

Before submitting any changes, agents must run the following checks:

- **Linting**: `npm run lint` (or equivalent markdown/code linters).
- **Formatting**: `npm run format`.
- **Testing**: `npm test` to ensure all tests pass and coverage is maintained.

If any of these checks fail, agents must resolve the issues before proceeding
with submission.
