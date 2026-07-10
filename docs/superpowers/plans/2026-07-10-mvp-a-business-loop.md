# MVP-A Business Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a customer-centered, locally runnable and verifiable MVP-A business loop.

**Architecture:** Preserve existing localStorage stores and normalize legacy data at service boundaries. Add small team-scoped services for timeline aggregation and file binding, then bind them into the existing pages.

**Tech Stack:** TypeScript, browser DOM APIs, localStorage, Node test runner.

## Global Constraints

- Preserve all existing localStorage keys and existing saved records.
- Derive `team_id` only from `SessionContext`.
- Keep the prototype backend-free and dependency-light.
- Prevent silent overwrite of confirmed quotations, orders, and payments.

---

### Task 1: Quotation versions and idempotent financial flow

**Files:** `src/domain/models.ts`, `src/api/mvpFlow.ts`, `src/api/orderFlow.ts`, `src/api/collectionFlow.ts`, `tests/businessLoop.test.mjs`

- [ ] Add failing tests for multi-line totals, legacy input, draft editing, copied versions, and repeated order/payment submission.
- [ ] Run the focused test and confirm the new APIs are missing.
- [ ] Implement normalization, version operations, and duplicate guards.
- [ ] Run the focused test and confirm it passes.

### Task 2: Customer timeline and lightweight file binding

**Files:** `src/domain/models.ts`, `src/api/customerTimeline.ts`, `src/api/fileAssets.ts`, `tests/businessLoop.test.mjs`

- [ ] Add failing tests for reverse-chronological aggregation and cross-team file isolation.
- [ ] Implement team-scoped timeline and file metadata services.
- [ ] Run the focused test and confirm it passes.

### Task 3: Page integration and validation

**Files:** `src/ui/mvpPages.ts`, `src/ui/render.ts`, `src/styles/app.css`, `README.md`

- [ ] Add multiple quotation rows, edit/copy actions, visible form errors, disabled submit behavior, timeline, and file forms.
- [ ] Update the acceptance path and limitations.
- [ ] Run lint, all tests, and build.
- [ ] Start the development server and perform browser-level acceptance checks.
- [ ] Review the final diff, commit, push, and open or merge the GitHub change.
