# Codex Workflow Guardrails

This document is a permanent workflow contract for development agents working on this repository.

## Main goal

Deliver the shelf CRM with the minimum practical rework and the minimum practical token usage. Do not make the user manually supervise implementation details.

## Required agent workflow

1. Read `AGENTS.md` before starting.
2. Start from latest `main`.
3. Use a fresh branch for the current task.
4. Do not reuse stale branches.
5. Do not update abandoned pull requests.
6. Keep the PR limited to the current task.
7. Run `npm run build` and `npm test` before reporting completion.
8. Open a PR only after the task is complete and verified.

## Scope discipline

1. API tasks should not modify UI files unless the task explicitly requires it.
2. UI tasks should not modify API/domain files unless the task explicitly requires it.
3. Do not modify scaffold, package scripts, build scripts, or configuration unless necessary.
4. Do not implement adjacent modules that are not requested.
5. Do not bundle multiple business modules into one PR.

## PR body requirements

Each PR must state:

1. Changed files.
2. Reason for each changed file.
3. Product rules implemented.
4. Build result.
5. Test result.
6. Explicit out-of-scope items.

## Repeated-error rule

If the same error type happens twice, it must be added to `AGENTS.md` or this file before a third attempt.

Current repeated errors that must not happen again:

1. Reusing a stale branch.
2. Resubmitting already merged scaffold or foundation files.
3. Mixing scaffold, UI, API, tests, and unrelated files in one narrow PR.
4. Treating a customer name alone as enough information for a usable customer record.
5. Pushing the user into repeated manual code-editing loops because of agent task-control failure.

## Customer record rule

A normal customer record cannot be created from only a vague name. A usable customer needs a customer or project name plus at least one useful follow-up signal: phone, WeChat, address, or clear demand.

If weak leads are supported, they must be visibly marked as weak leads or pending information. They must not appear as complete customers.
