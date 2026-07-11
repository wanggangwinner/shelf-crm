# Customer, Contact, and Opportunity Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate customers from sales opportunities while preserving all existing localStorage data and flows.

**Architecture:** Add a versioned domain-foundation store for contacts and opportunities. On first read, create one idempotent “首次项目” opportunity for every legacy customer; existing APIs continue accepting customer IDs while new APIs expose opportunity relationships.

**Tech Stack:** TypeScript, localStorage, Node test runner, browser DOM.

## Global Constraints

- `docs/PRODUCT_DEVELOPMENT_MANUAL.md` is authoritative.
- Every team business record contains `team_id` derived from `SessionContext`.
- Migration is idempotent and never deletes legacy keys.
- Existing customer, follow-up, quotation, order, and payment tests remain green.

---

### Task 1: Contact and opportunity domain store

**Files:**
- Modify: `src/domain/models.ts`
- Create: `src/api/opportunities.ts`
- Test: `tests/opportunities.test.mjs`

**Interfaces:**
- Produces: `ensureCustomerFoundation(session)`, `listContacts(session, customerId)`, `createContact(session, input)`, `listOpportunities(session, customerId?)`, `createOpportunity(session, input)`, `getOpportunity(session, opportunityId)`.

- [ ] Write tests proving automatic default opportunity creation, idempotency, contact creation, and cross-team isolation.
- [ ] Run `npm test -- --test-name-pattern="opportunity|contact|migration"`; expect missing-module failure.
- [ ] Add `Contact`, `Opportunity`, inputs, and a versioned `shelf-crm-domain-foundation-state-v1` store.
- [ ] Run the focused tests; expect all new tests to pass.
- [ ] Commit `Add customer opportunity foundation`.

### Task 2: Link new activity to opportunities compatibly

**Files:**
- Modify: `src/domain/models.ts`, `src/api/followUps.ts`, `src/api/mvpFlow.ts`, `src/api/orderFlow.ts`, `src/api/customerTimeline.ts`
- Test: `tests/opportunities.test.mjs`, `tests/businessLoop.test.mjs`

**Interfaces:**
- Consumes: `getDefaultOpportunity(session, customerId)`.
- Produces: optional `opportunityId` on follow-ups, tasks, quotations, orders, and timeline events; omitted legacy input resolves to the default opportunity.

- [ ] Add tests showing all newly created downstream records receive the default or explicitly selected opportunity ID.
- [ ] Run focused tests; expect missing opportunity IDs.
- [ ] Resolve and persist opportunity IDs without changing existing call signatures.
- [ ] Run all tests; expect legacy and new suites to pass.
- [ ] Commit `Link sales flow to opportunities`.

### Task 3: Minimal customer-detail project UI and documentation

**Files:**
- Modify: `src/ui/render.ts`, `src/styles/app.css`, `README.md`
- Test: `tests/opportunities.test.mjs`

**Interfaces:**
- Consumes: contact/opportunity list and create APIs.
- Produces: customer-detail sections for contacts and projects, including a project creation form.

- [ ] Add service-level validation tests for blank names and wrong-team customer IDs.
- [ ] Run focused tests; expect validation failures.
- [ ] Render contacts/projects and bind create forms with visible errors.
- [ ] Run lint, all tests, build, and browser validation.
- [ ] Commit `Expose contacts and projects in customer detail`.

## Remaining Product Manual Roadmap

After this plan: quotation set/version state machine; independent orders/receivables/payments; file bindings and vouchers; AI suggestion confirmation; permissions; dashboard drill-down; mobile completion.
