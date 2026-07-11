# Quotation Set and Version Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the manual’s quotation set/version lifecycle with legacy-data compatibility.

**Architecture:** Extend the existing MVP flow store with quotation sets and normalize legacy quotations on read. Keep public list/create APIs compatible while enforcing draft-only editing and explicit send, confirm, supersede, void, and conversion transitions.

**Tech Stack:** TypeScript, localStorage, Node test runner, DOM UI.

## Global Constraints

- Derive `team_id`, customer, and opportunity from the session and parent objects.
- Never mutate sent, confirmed, replaced, converted, expired, or void quotation content.
- Preserve legacy storage keys and migrate idempotently.

### Task 1: Lifecycle service

**Files:** `src/domain/models.ts`, `src/api/mvpFlow.ts`, `tests/quotationLifecycle.test.mjs`

- [ ] Test draft creation, set/version grouping, send lock, confirmation, replacement, voiding, conversion, and legacy normalization.
- [ ] Run focused tests and confirm failure from missing lifecycle APIs.
- [ ] Implement `sendQuotation`, `voidQuotation`, `expireQuotation`, and `markQuotationConverted`; restrict editing and confirmation transitions.
- [ ] Run all tests and update old expectations to the authoritative lifecycle.

### Task 2: UI and order integration

**Files:** `src/ui/mvpPages.ts`, `src/api/orderFlow.ts`, `README.md`

- [ ] Add send/copy/confirm/void controls appropriate to each state.
- [ ] Mark the confirmed quotation converted after order persistence.
- [ ] Run lint, tests, build, and browser verification.
- [ ] Commit, merge to `main`, verify again, and push.
