# shelf-crm / 货架客户 CRM

MVP-A foundation for a shelf-sales-specific CRM: customer management, follow-up records, AI suggestions, task reminders, quotations, orders, receivables, and lightweight mobile entry.

## MVP-A current delivery status

The repository now contains a runnable lightweight main business loop:

```text
首次进入/开发登录 → 工作空间初始化 → 客户录入 → 跟进记录 → 任务提醒 → 报价 → 报价确认 → 订单生成 → 定金/尾款回款 → 工作台统计
```

This is not a production SaaS release yet. It is a local-storage MVP prototype for validating the shelf-sales workflow before server API, database, real auth, file storage, team permission expansion, and commercial billing are built.

## Local development

### Windows PowerShell verification

```powershell
npm install
npm run build
npm test
npm run dev
```

Then open <http://localhost:5173> and click **使用开发账号进入**.

If no workspace exists in local storage, onboarding appears. Choose personal/team workspace, choose a role, review the default shelf-industry configuration counts, and click **完成设置，进入工作台**.

### macOS / Linux verification

```bash
npm install
npm run build
npm test
npm run dev
```

Then open <http://localhost:5173> and follow the same development login and onboarding flow.

## End-to-end MVP-A validation path

Use this exact path for the first whole-system check:

1. Open the app and enter with the development account.
2. Finish the first-entry workspace setup.
3. Go to **客户管理**.
4. Create a customer with a realistic demand phrase, for example:

   ```text
   80平方米 便利店货架 李总 电话：15955555555 临沂
   ```

5. Confirm the customer detail card shows area, store type, contact info, stage, level, and completeness status.
6. Add a follow-up record in the customer detail panel, such as:

   ```text
   客户说门店80平方米，准备下周装修，想先看便利店货架方案和报价，担心运费太高。
   ```

7. Go to **报价管理**.
8. Create a quotation for that customer, for example:
   - 产品：便利店主架
   - 规格：900*450*2000
   - 数量：10
   - 单价：320
   - 运费：500
   - 安装费：800
   - 折扣：0
9. Check that quotation total is calculated and a same-day quotation follow-up task is created.
10. Mark the quotation as **客户确认**.
11. Go to **订单/回款**.
12. Select the confirmed quotation and generate an order, for example:
    - 定金：1000
    - 尾款：3500
13. Check that the order appears with receivable nodes, and that定金/尾款 tasks are created automatically.
14. Record a deposit collection.
15. Confirm the deposit node becomes collected and the related deposit task becomes completed.
16. Record final payment.
17. Confirm the order becomes completed and the workbench shows updated order, receivable, and received amounts.

## Implemented MVP-A modules

- Development login and first-entry onboarding.
- Personal/team workspace initialization.
- Default shelf-industry configuration seed.
- Web shell with 10 primary modules and mobile bottom navigation foundation.
- Customer creation with demand phrase parsing, phone extraction, duplicate warning, team isolation, detail card, and ownership history.
- Follow-up records with raw content, generated summary, objections/blockers, and next action.
- Task reminders with manual creation, quotation task creation, order receivable task creation, and task completion.
- Quotation management with lightweight structured line item, fee breakdown, version number, total amount, and confirmation state.
- Customer business timeline combining follow-ups, tasks, quotations, orders, payments, and files in reverse chronological order.
- Multi-line quotation creation, editable unconfirmed drafts at the service boundary, and one-click copied versions.
- Form-level errors and duplicate-operation guards for quotations, order conversion, and collection.
- Lightweight customer/order file metadata binding with strict `team_id` isolation.
- Order/receivables management with confirmed quotation conversion, deposit/final payment nodes, payment records, and order status updates.
- Workbench statistics for customers, follow-ups, tasks, quotations, orders, receivables, and received amount.
- Tests covering team isolation, customer module, follow-ups, and MVP flow.

## Known limitations before V1

- Data is stored in browser `localStorage`, not a real backend database.
- Login is a development placeholder, not production authentication.
- AI extraction is deterministic local logic, not connected to a live model API.
- File content upload/storage, scheme drawing previews, delivery/installation, after-sales, refunds/adjustments, public customer pool, and advanced dashboards are not yet implemented. The current file feature stores metadata and business binding only.
- Team permissions are foundation-level only; detailed role/data-scope/sensitive-field permissions are V1 work.
- Quotation now supports multiple line items and version copying. The current page creates and copies versions; full inline editing UI and reusable product templates remain V1 work.
- There is no production server-side audit log yet. MVP uses local state and module-level guardrails only.

## Clean local state / re-run onboarding

The development adapter stores foundation state in browser `localStorage` under `shelf-crm-foundation-state-v2`. Business modules also store MVP flow data in local storage.

To reset the local prototype:

1. Open <http://localhost:5173>.
2. Open browser DevTools.
3. Run this in the Console:

```js
localStorage.clear();
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

## Next bug-fix and V1 expansion plan

The next development pass should focus on concentrated quality rather than adding random functions:

1. Run the full local verification path on Windows and fix UI/runtime issues first.
2. Run a concentrated cross-browser and mobile-layout bug-fix pass on the expanded customer timeline and quotation workflow.
3. Add full inline quote editing UI, product templates, and printable/exportable quote documents.
4. Replace metadata-only file binding with real upload storage, preview, download, and temporary-file cleanup.
5. Move persistence from `localStorage` to a backend API and real database.
6. Expand role permissions, operation logs, public pool, delivery/installation, and after-sales into V1.
