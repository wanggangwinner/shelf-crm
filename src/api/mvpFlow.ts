import type { CreateQuotationInput, CreateTaskInput, Quotation, QuotationLineItem, SalesTask, SessionContext } from '../domain/models.js';
import { getCustomer } from './customers.js';

const STORAGE_KEY = 'shelf-crm-mvp-flow-state-v1';
const ORDER_STORAGE_KEY = 'shelf-crm-order-flow-state-v1';
interface State { tasks: SalesTask[]; quotations: Quotation[] }
const emptyState = (): State => ({ tasks: [], quotations: [] });
function loadState(): State { if (typeof localStorage === 'undefined') return emptyState(); const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState(); }
function saveState(state: State): void { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const now = () => new Date().toISOString();
const createId = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
function dayOffset(days: number): string { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function money(value: unknown): number { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100) / 100) : 0; }
function customerError(session: SessionContext, customerId: string): string | undefined { return getCustomer(session, customerId) ? undefined : '客户不存在或不属于当前团队。'; }

export function listTasks(session: SessionContext): SalesTask[] { return loadState().tasks.filter((task) => task.team_id === session.currentTeam.id).sort((a, b) => a.status.localeCompare(b.status) || a.dueAt.localeCompare(b.dueAt)); }
export function createTask(session: SessionContext, input: CreateTaskInput): { task?: SalesTask; error?: string } {
  const error = customerError(session, input.customerId); if (error) return { error };
  const title = input.title.trim(); if (!title) return { error: '请填写任务标题。' };
  const state = loadState();
  const task: SalesTask = { id: createId(), team_id: session.currentTeam.id, customerId: input.customerId, ownerUserId: session.user.id, title, dueAt: input.dueAt || dayOffset(1), status: '待处理', source: input.source ?? '手动', relatedId: input.relatedId, createdAt: now() };
  state.tasks.push(task); saveState(state); return { task };
}
export function completeTask(session: SessionContext, taskId: string): { task?: SalesTask; error?: string } {
  const state = loadState(); const task = state.tasks.find((item) => item.team_id === session.currentTeam.id && item.id === taskId);
  if (!task) return { error: '任务不存在或不属于当前团队。' }; if (task.status === '已完成') return { task };
  task.status = '已完成'; task.completedAt = now(); saveState(state); return { task };
}
export function listQuotations(session: SessionContext): Quotation[] { return loadState().quotations.filter((q) => q.team_id === session.currentTeam.id).map((q) => ({ ...q, lineItems: q.lineItems ?? [], updatedAt: q.updatedAt ?? q.createdAt })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
function normalizeItems(input: CreateQuotationInput): QuotationLineItem[] | undefined {
  const raw = input.lineItems?.length ? input.lineItems : [{ productName: input.productName ?? '', specification: input.specification, quantity: input.quantity, unitPrice: input.unitPrice, remark: input.remark }];
  if (raw.some((item) => !item.productName.trim() || money(item.quantity) <= 0 || money(item.unitPrice) <= 0)) return undefined;
  return raw.map((item) => { const quantity = money(item.quantity); const unitPrice = money(item.unitPrice); return { id: createId(), productName: item.productName.trim(), specification: item.specification?.trim() ?? '', quantity, unitPrice, subtotal: money(quantity * unitPrice), remark: item.remark?.trim() ?? '' }; });
}
function applyTotals(quotation: Quotation): void { quotation.productAmount = money(quotation.lineItems.reduce((sum, item) => sum + item.subtotal, 0)); quotation.totalAmount = money(quotation.productAmount + quotation.freightFee + quotation.installationFee + quotation.designFee - quotation.discountAmount); }
export function createQuotation(session: SessionContext, input: CreateQuotationInput): { quotation?: Quotation; task?: SalesTask; error?: string } {
  const error = customerError(session, input.customerId); if (error) return { error }; const lineItems = normalizeItems(input); if (!lineItems) return { error: '每个报价产品都必须填写名称，且数量和单价必须大于 0。' };
  const state = loadState(); const timestamp = now();
  const quotation: Quotation = { id: createId(), team_id: session.currentTeam.id, customerId: input.customerId, version: Math.max(0, ...state.quotations.filter((q) => q.team_id === session.currentTeam.id && q.customerId === input.customerId).map((q) => q.version)) + 1, status: '已发送', productAmount: 0, freightFee: money(input.freightFee), installationFee: money(input.installationFee), designFee: money(input.designFee), discountAmount: money(input.discountAmount), totalAmount: 0, lineItems, feedback: '', createdAt: timestamp, updatedAt: timestamp };
  applyTotals(quotation); if (quotation.totalAmount <= 0) return { error: '报价总额必须大于 0，折扣不能超过报价金额。' };
  state.quotations.push(quotation); saveState(state); const task = createTask(session, { customerId: input.customerId, title: '确认客户是否接受报价，并记录异议或修改意见', dueAt: dayOffset(0), source: '报价生成', relatedId: quotation.id }).task; return { quotation, task };
}
export function updateQuotationDraft(session: SessionContext, quotationId: string, changes: Partial<CreateQuotationInput>): { quotation?: Quotation; error?: string } {
  const state = loadState(); const quotation = state.quotations.find((q) => q.team_id === session.currentTeam.id && q.id === quotationId); if (!quotation) return { error: '报价不存在或不属于当前团队。' }; if (quotation.status === '客户确认') return { error: '客户确认的报价不能直接修改，请复制为新版本。' };
  if (changes.lineItems) { const items = normalizeItems({ customerId: quotation.customerId, lineItems: changes.lineItems }); if (!items) return { error: '每个报价产品都必须填写名称，且数量和单价必须大于 0。' }; quotation.lineItems = items; }
  if (changes.freightFee !== undefined) quotation.freightFee = money(changes.freightFee); if (changes.installationFee !== undefined) quotation.installationFee = money(changes.installationFee); if (changes.designFee !== undefined) quotation.designFee = money(changes.designFee); if (changes.discountAmount !== undefined) quotation.discountAmount = money(changes.discountAmount);
  applyTotals(quotation); if (quotation.totalAmount <= 0) return { error: '报价总额必须大于 0，折扣不能超过报价金额。' }; quotation.updatedAt = now(); saveState(state); return { quotation };
}
export function copyQuotationVersion(session: SessionContext, quotationId: string): { quotation?: Quotation; error?: string } {
  const state = loadState(); const source = state.quotations.find((q) => q.team_id === session.currentTeam.id && q.id === quotationId); if (!source) return { error: '报价不存在或不属于当前团队。' }; const timestamp = now();
  const quotation: Quotation = { ...source, id: createId(), version: Math.max(0, ...state.quotations.filter((q) => q.team_id === source.team_id && q.customerId === source.customerId).map((q) => q.version)) + 1, status: '已发送', lineItems: (source.lineItems ?? []).map((item) => ({ ...item, id: createId() })), copiedFromId: source.id, createdAt: timestamp, updatedAt: timestamp, confirmedAt: undefined };
  state.quotations.push(quotation); saveState(state); return { quotation };
}
export function confirmQuotation(session: SessionContext, quotationId: string): { quotation?: Quotation; error?: string } { const state = loadState(); const quotation = state.quotations.find((q) => q.team_id === session.currentTeam.id && q.id === quotationId); if (!quotation) return { error: '报价不存在或不属于当前团队。' }; if (quotation.status === '客户确认') return { quotation }; quotation.status = '客户确认'; quotation.confirmedAt = now(); quotation.updatedAt = quotation.confirmedAt; saveState(state); return { quotation }; }
export function getMvpDashboard(session: SessionContext) { const state = loadState(); const tasks = state.tasks.filter((t) => t.team_id === session.currentTeam.id); const quotations = state.quotations.filter((q) => q.team_id === session.currentTeam.id); const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(ORDER_STORAGE_KEY); const orders = raw ? (JSON.parse(raw).orders ?? []).filter((o: { team_id: string }) => o.team_id === session.currentTeam.id) : []; const nodes = orders.flatMap((o: { receivableNodes: Array<{ plannedAmount: number; receivedAmount: number }> }) => o.receivableNodes); return { pendingTasks: tasks.filter((t) => t.status === '待处理').length, quotations: quotations.length, confirmedQuotations: quotations.filter((q) => q.status === '客户确认').length, orders: orders.length, receivableAmount: money(nodes.reduce((sum: number, n: { plannedAmount: number }) => sum + n.plannedAmount, 0)), receivedAmount: money(nodes.reduce((sum: number, n: { receivedAmount: number }) => sum + n.receivedAmount, 0)) }; }
export function resetMvpFlowState(): void { localStorage.removeItem(STORAGE_KEY); }
