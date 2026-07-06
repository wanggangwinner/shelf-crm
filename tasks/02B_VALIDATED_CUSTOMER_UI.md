# Task 02B: Validated Customer Management UI

Read first:

- `AGENTS.md`
- `docs/CODEX_WORKFLOW.md`
- `docs/PR_REVIEW_CHECKLIST.md`
- `docs/TASK_TEMPLATE.md`

## Goal

Implement the customer management UI using the existing customer API, with corrected product rules.

## Product rules

1. A customer name alone is not enough to create a normal customer.
2. A normal customer needs a customer/project name plus at least one useful follow-up signal: phone, WeChat, detailed address, or clear demand.
3. If the user only enters a weak name such as 李总, 王总, 便利店客户, or 测试客户, block saving and show: 客户信息不足，请至少填写手机号、微信、地址或明确需求。
4. Demand phrase parsing must support area formats including 80㎡, 80平方米, and 80平.
5. Demand phrase parsing must support store types including 便利店, 超市, 药店, 仓库, 母婴店, 文具店, 烟酒店.
6. Demand phrase parsing must extract an 11-digit mainland China mobile number from the phrase.
7. When parsing demand, auto-fill empty fields only. Do not overwrite fields the user already filled manually.
8. Duplicate warnings must show clear reasons: 手机号相同, 微信相同, 客户名称和城市相同, 地址相似.
9. Duplicate warning must block the first save and only allow creation after explicit confirm-create-anyway.
10. Customer detail must show data completeness: 资料完整 or 待补充资料.

## Acceptance checks

1. Customer Management opens from the sidebar.
2. Input phrase `80平方米 超市李总 电话：15955555555 内蒙古` and parse.
3. Area becomes `80㎡`, store type becomes `超市`, phone becomes `15955555555`.
4. Saving only `李总` with no phone, WeChat, address, or clear demand is blocked.
5. Creating another customer with the same phone shows a duplicate warning.
6. Confirm-create-anyway works only after the warning.
7. Customer list and detail update after saving.
8. `npm run build` passes.
9. `npm test` passes.

## Preferred files

- `src/ui/render.ts`
- `src/styles/app.css`

Touch API/domain/tests only if required for parser or validation correctness.

## Out of scope

Follow-up records, tasks, quotations, orders, receivables, files, public pool, dashboards, and full permissions.

## PR title

Implement validated customer management UI
