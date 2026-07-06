# shelf-crm / 货架客户 CRM

MVP-A foundation for a shelf-sales-specific CRM: customer management, follow-up records, AI suggestions, task reminders, quotations, orders, receivables, and lightweight mobile entry.

## Task 01 scope implemented

This repository is now bootstrapped as a dependency-light TypeScript web app with:

- Polished login page with password, verification-code, WeChat, and Enterprise WeChat placeholder flows.
- Safe development login placeholder that creates/selects a local development user without production credentials.
- Personal/team workspace creation and current workspace context.
- First-entry onboarding: workspace kind, user role, default configuration review, and first-customer prompt placeholder.
- Default shelf-industry configuration seed for customer stages, sources, risk tags, task types, quotation fee items, file types, store types, and shelf product categories.
- Web app shell with 10 primary modules.
- Mobile responsive foundation with 5 bottom entries: Home, Customers, Tasks, Add, My/Profile.
- Foundation TypeScript models and a PostgreSQL-friendly schema draft for User, Team/Workspace, TeamMember, Role, WorkspaceConfig, OnboardingProgress, and OperationLog.
- Team isolation helper utilities that require future business data to be scoped by `team_id` from session context.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click **使用开发登录进入**. If no workspace exists in local storage, onboarding will appear.

## Checks

```bash
npm run lint
npm test
npm run build
```

## Data model and team isolation notes

- `src/domain/models.ts` defines the foundation domain model. All workspace-owned records use `team_id`.
- `src/schema.sql` mirrors the foundation model in a PostgreSQL-friendly schema draft.
- `src/domain/teamIsolation.ts` centralizes the rule that API/service queries must derive `team_id` from the authenticated session, never from raw frontend input.
- `src/api/devAuth.ts` is intentionally a local-storage development adapter. It is separated from future production authentication and should be replaced by real server-side session/auth code later.

## Remaining for Task 02

Do not treat placeholder module cards as implemented CRM features. The next issue should add the actual customer module only: customer list, creation, duplicate detection, detail status card, ownership history, and filters.
