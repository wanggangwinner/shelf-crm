# MVP-A Business Loop Expansion Design

## Scope

Extend the current localStorage MVP without replacing its storage keys or breaking existing single-line quotations. Deliver one coherent customer-centered loop with a unified timeline, multi-line quotation drafts and copied versions, visible operation errors, duplicate-submit guards, and lightweight metadata-only file bindings.

## Architecture

- Keep the existing customer, follow-up, task, quotation, and order stores.
- Normalize old quotation records at read time so the original single-line shape remains valid.
- Add focused timeline and file-asset services. Every read and write is scoped to the session team.
- Keep uploaded-file content outside this prototype: the MVP stores file metadata and business binding only.
- Return structured `{ value?, error? }` results from write operations so pages can render form-level feedback.
- Enforce idempotency where a repeated click would create duplicate orders, payments, or quotation versions.

## User Flow

The customer detail page shows follow-ups, tasks, quotations, orders, payments, and files in one reverse-chronological timeline. The quotation page accepts multiple product rows, can edit an unconfirmed draft, and can copy any quotation into a new version. Customer and order records can receive lightweight file bindings. Existing order and collection screens remain compatible.

## Verification

Domain tests cover team isolation, legacy quotation compatibility, multi-line totals, version copying/edit rules, duplicate-operation prevention, file binding, and timeline ordering. The full local acceptance path is then exercised in a browser after lint, tests, and build pass.
