# shelf-crm / 货架客户 CRM

MVP-A foundation for a shelf-sales-specific CRM: customer management, follow-up records, AI suggestions, task reminders, quotations, orders, receivables, and lightweight mobile entry.

## Task 01 scope implemented

This repository is bootstrapped as a dependency-light TypeScript web app with:

- Login page placeholders for password, verification-code, WeChat, and Enterprise WeChat flows.
- Safe development login placeholder that creates/selects a local development user without production credentials.
- Personal/team workspace creation and current workspace context.
- First-entry onboarding placeholder: workspace kind, user role, default configuration review, and first-customer prompt.
- Default shelf-industry configuration seed for customer stages, sources, risk tags, task types, quotation fee items, file types, store types, and shelf product categories.
- Web app shell with 10 primary modules.
- Mobile responsive foundation with 5 bottom entries: Home, Customers, Tasks, Add, My/Profile.
- Foundation TypeScript models and a PostgreSQL-friendly schema draft for User, Team/Workspace, TeamMember, Role, WorkspaceConfig, OnboardingProgress, and OperationLog.
- Team isolation helper utilities that require future business data to be scoped by `team_id` from session context.

## Local development

### Windows PowerShell verification

```powershell
npm install
npm run build
npm test
npm run dev
```

Then open <http://localhost:5173> and click **使用开发登录进入**.
If no workspace exists in local storage, onboarding appears. Choose personal/team workspace, choose a role, review the default shelf-industry configuration counts, and click **确认并进入工作台**.

### macOS / Linux verification

```bash
npm install
npm run build
npm test
npm run dev
```

Then open <http://localhost:5173> and follow the same development login and onboarding flow.

### Re-run onboarding from a clean local state

The development adapter stores Task 01 state in browser `localStorage` under `shelf-crm-foundation-state-v2`.
To reset the local prototype and see onboarding again:

1. Open <http://localhost:5173>.
2. Open browser DevTools.
3. Run this in the Console:

```js
localStorage.removeItem('shelf-crm-foundation-state-v2');
location.reload();
```

## Checks

```bash
npm run lint
npm test
npm run build
```

The `build`, `test`, and `dev` scripts use Node scripts instead of shell-only commands, so they are intended to work from Windows PowerShell as well as POSIX shells. Generated output goes to `dist/` and `public/`, both of which are ignored by Git.

## Data model and team isolation notes

- `src/domain/models.ts` defines the foundation domain model. All workspace-owned records use `team_id`.
- `src/schema.sql` mirrors the foundation model in a PostgreSQL-friendly schema draft.
- `src/domain/teamIsolation.ts` centralizes the rule that API/service queries must derive `team_id` from the authenticated session, never from raw frontend input.
- `src/api/devAuth.ts` is intentionally a local-storage development adapter. It is separated from future production authentication and should be replaced by real server-side session/auth code later.
- Local development IDs are UUID-compatible placeholders so they line up with the schema draft. Production database IDs must still be generated and validated by the backend/database, not trusted from the browser.

## Onboarding placeholder note

Task 01 intentionally completes onboarding in one lightweight screen. Later tasks may split onboarding into a true multi-step flow, but this PR does not implement customer management, duplicate detection, AI extraction, quotation/order/receivables, or file upload business flows.

## Reviewer note

Task 01 has passed product-scope review after the Windows-compatible script update and the Web navigation correction. After merging, verify locally on Windows with `npm install`, `npm run build`, `npm test`, and `npm run dev` before starting Task 02.

## Remaining for Task 02

Do not treat placeholder module cards as implemented CRM features. The next issue should add the actual customer module only: customer list, creation, duplicate detection, detail status card, ownership history, and filters.
