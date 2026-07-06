# PR Review Checklist

Use this checklist before merging any pull request.

## Branch and scope

- The PR starts from latest `main`.
- The PR does not reuse a stale branch.
- The PR does not update an abandoned PR.
- The changed files match the task scope.
- The PR does not resubmit already merged scaffold files.
- The PR does not include unrelated refactors.

## Product correctness

- The implementation satisfies the product rule, not only a demo path.
- Customer records contain useful follow-up or identification information.
- Weak or incomplete business data is clearly marked.
- Duplicate warnings show clear reasons.
- Important business actions require explicit user confirmation.

## Engineering correctness

- `team_id` isolation is preserved.
- Frontend-provided `team_id` is not trusted blindly.
- Parser or AI suggestions do not overwrite user-entered data silently.
- Build passes.
- Tests pass.

## Merge decision

Merge only if all applicable checks pass. If the same error type has appeared twice, update `AGENTS.md` or `docs/CODEX_WORKFLOW.md` with a permanent rule before another implementation attempt.
