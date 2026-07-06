# AGENTS.md

## Project identity

This repository is for a shelf-sales-specific CRM system named **货架客户 CRM**.

The current target is **MVP-A**, not the full SaaS product.

MVP-A must first support personal/small-team use and run the real business chain:

**Customer management → Follow-up records → AI extraction/summarization → Task reminders → Quotation → Deal/order → Receivables → Lightweight mobile entry**

Do not expand the first implementation into a full enterprise CRM, OA system, ERP, finance system, or BI platform.

---

## Product principles

1. The system is designed for shelf sales, supermarket shelf sales, convenience-store shelf projects, warehouse shelves, and similar B2B sales scenarios.
2. Customer is the central object. Project/order is the main business line.
3. Quotations, schemes/files, receivables/payments, AI records, tasks, and logs must be independent linked objects, not stuffed into the customer table.
4. MVP-A must be usable before it is complete. Prioritize the main sales loop over broad feature coverage.
5. Keep the mobile side extremely lightweight. Mobile is for quick creation, follow-up, uploads, reminders, and simple viewing. It is not a full admin backend.

---

## MVP-A must include

- Account login foundation.
- Default personal/team workspace creation.
- Strict `team_id` field on all team-space business data.
- First-entry onboarding flow.
- Default shelf-industry configurations.
- Customer management.
- Duplicate customer detection.
- Customer detail top status card.
- Customer ownership history.
- Follow-up records with raw content preserved.
- AI extraction and summarization with fixed JSON output and fallback parsing.
- AI suggestions only; human confirmation is required before writing key data.
- Task reminders and today's workbench.
- Lightweight quotation management with versions and structured line items.
- Lightweight order and receivables management.
- File asset management with reliable business binding.
- Backend permission checks for key APIs.
- Basic operation logs.
- Dashboard/workbench numbers must drill down to the exact list behind the number.
- Lightweight mobile H5/PWA entry.

---

## Do not implement in MVP-A

Do not implement these unless a later issue explicitly asks for them:

- Complete public customer pool.
- Complete customer handover console.
- Complex custom role/permission backend.
- Complete personal special authorization backend.
- Full refund/adjustment module.
- Complete delivery/installation management.
- Complete after-sales/repurchase/referral module.
- Complete log center.
- Sales execution dashboard.
- Complex BI or custom report builder.
- Native iOS/Android apps.
- Desktop client.
- CAD automatic recognition/takeoff.
- Personal WeChat automatic reading.
- Enterprise WeChat full auto-sync.
- Private deployment.
- ERP inventory/procurement/cost accounting.

---

## Engineering guardrails

These rules are mandatory:

1. Every business table belonging to a team workspace must include `team_id`.
2. Every query for team business data must be scoped by `team_id` from the authenticated session/context. Do not trust a raw frontend-provided `team_id` blindly.
3. Important APIs must enforce backend permission checks. Frontend button hiding is not security.
4. AI must inherit the current user's permissions. AI cannot analyze, summarize, expose, or export data the user cannot access.
5. AI output must be treated as a suggestion. It cannot directly overwrite formal customer, quotation, order, receivable, permission, or file data.
6. Raw communication content and raw uploaded files must be preserved. AI summaries do not replace source evidence.
7. Confirmed quotations, confirmed orders, and confirmed payment records must not be silently overwritten.
8. Quotation totals, order amounts, and receivable/payment status must be validated/calculated on the backend. Do not trust frontend-only calculations.
9. File uploads must create a business-bound `file_asset` record. Unbound uploads must go to a temporary-file state and be cleanable.
10. Workbench/dashboard counts and their drill-down lists must use shared query logic.
11. Mobile pages must remain fast and minimal. Do not duplicate full Web admin functions on mobile.
12. Use soft delete/void/archive mechanisms for key business data. Do not physically delete confirmed business records in normal user flows.

---

## AI output contract

For customer/follow-up extraction, return JSON matching this shape:

```json
{
  "summary": "",
  "store_type": "",
  "area": "",
  "location": "",
  "product_demand": [],
  "budget": "",
  "opening_time": "",
  "objections": [],
  "blockers": [],
  "risk_tags": [],
  "next_action": "",
  "next_follow_time": "",
  "confidence": 0,
  "evidence": []
}
```

If JSON parsing fails:

- Do not write into formal fields.
- Show the AI output as plain text for manual review.
- Log the parse failure.
- Allow the user to manually copy or confirm selected content.

---

## Default shelf-industry configurations

A newly created workspace should initialize sensible defaults:

### Customer stages

1. Lead
2. Early communication
3. Materials/site
4. Design/scheme
5. Quotation negotiation
6. Deal confirmation
7. Delivery/installation
8. Payment/after-sales
9. Repurchase/referral/lost

### Risk tags

- Price-shopping/comparison
- Unclear demand
- Materials not cooperating
- Low budget
- Competitor price pressure
- Non-decision-maker
- Uncertain cycle
- High distance cost
- Payment risk
- Profit risk
- Long non-response
- Low trust

### Task types

- Follow-up
- Overdue follow-up
- Waiting for customer materials
- Waiting for design/scheme
- Scheme/quotation feedback confirmation
- Deposit collection
- Final payment collection
- Delivery/installation reminder

### Quotation fee items

- Product amount
- Freight/shipping fee
- Installation fee
- Design/measurement/travel fee
- Discount amount
- Final quote total

---

## First implementation order

Implement in this order:

1. Project foundation, authentication placeholder, workspace/team foundation, `team_id` isolation.
2. First-entry onboarding and default configurations.
3. Customer management with duplicate detection and customer status card.
4. Follow-up records and AI extraction/summarization.
5. Task reminders and today's workbench.
6. Quotation management with versions and structured items.
7. Lightweight order and receivables management.
8. File asset management with temporary-file cleanup logic.
9. Lightweight mobile entry.
10. Tests and acceptance verification.

---

## Acceptance expectations

A user should be able to:

1. Log in or use a development login placeholder.
2. Enter a default personal/team workspace.
3. Complete first-entry onboarding.
4. Create a customer from a minimal phrase such as `80㎡便利店货架`.
5. See duplicate customer warnings when entering repeated phone/WeChat/name signals.
6. Open the customer detail page and see a top status card.
7. Add a follow-up record by pasting WeChat-style text.
8. Run AI extraction and review suggested fields.
9. Confirm selected AI suggestions and preserve raw content.
10. Create or confirm a follow-up task.
11. Create a quotation with line items and fee split.
12. Send/mark quotation and generate a same-day feedback task.
13. Mark a final quote and convert it into an order.
14. Create deposit/final-payment receivable nodes.
15. Record an actual payment with voucher upload.
16. See today's workbench counts and click into the matching list.
17. Use mobile layout for quick customer creation and follow-up recording.

---

## Coding style expectation

- Keep code modular and readable.
- Prefer explicit domain names over generic names.
- Do not over-engineer.
- Add comments only where they explain important business rules.
- Add tests for high-risk logic: team isolation, duplicate detection, AI parse fallback, quotation totals, order/receivable status, and file binding.
