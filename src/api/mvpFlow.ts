import type {
  CreateQuotationInput,
  CreateTaskInput,
  Quotation,
  QuotationLineItem,
  SalesTask,
  SessionContext,
} from '../domain/models.js';
import { getCustomer } from './customers.js';

const STORAGE_KEY = 'shelf-crm-mvp-flow-state-v1';
const ORDER_STORAGE_KEY = 'shelf-crm-order-flow-state-v1';

interface MvpFlowState {
  tasks: SalesTask[];
  quotations: Quotation[];
}

interface OrderSnapshotState {
  orders: Array<{
    team_id: string;
    receivableNodes: Array<{ plannedAmount: number; receivedAmount: number }>;
  }>;
}

function emptyState(): MvpFlowState {
  return { tasks: [], quotations: [] };
}

function loadState(): MvpFlowState {
  if (typeof localStorage === 'undefined') return emptyState();
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
}

function loadOrderSnapshot(): OrderSnapshotState {
  if (typeof localStorage === 'undefined') return { orders: [] };
  const raw = localStorage.getItem(ORDER_STORAGE_KEY);
  return raw ? { orders: [], ...JSON.parse(raw) } : { orders: [] };
}

function saveState(state: MvpFlowState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function now(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dayOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function money(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100) / 100) : 0;
}

function customerError(session: SessionContext, customerId: string): string | undefined {
  return getCustomer(session, customerId) ? undefined : '客户不存在或不属于当前团队。';
}

export function listTasks(session: SessionContext): SalesTask[] {
  return loadState()
    .tasks.filter((task) => task.team_id === session.currentTeam.id)
    .sort((a, b) => a.status.localeCompare(b.status) || a.dueAt.localeCompare(b.dueAt));
}

export function createTask(session: SessionContext, input: CreateTaskInput): { task?: SalesTask; error?: string } {
  const error = customerError(session, input.customerId);
  if (error) return { error };
  const title = input.title.trim();
  if (!title) return { error: '请填写任务标题。' };
  const state = loadState();
  const task: SalesTask = {
    id: createId(),
    team_id: session.currentTeam.id,
    customerId: input.customerId,
    ownerUserId: session.user.id,
    title,
    dueAt: input.dueAt || dayOffset(1),
    status: '待处理',
    source: input.source ?? '手动',
    relatedId: input.relatedId,
    createdAt: now(),
  };
  state.tasks.push(task);
  saveState(state);
  return { task };
}

export function completeTask(session: SessionContext, taskId: string): { task?: SalesTask; error?: string } {
  const state = loadState();
  const task = state.tasks.find((item) => item.team_id === session.currentTeam.id && item.id === taskId);
  if (!task) return { error: '任务不存在或不属于当前团队。' };
  task.status = '已完成';
  task.completedAt = now();
  saveState(state);
  return { task };
}

export function listQuotations(session: SessionContext): Quotation[] {
  return loadState().quotations.filter((quotation) => quotation.team_id === session.currentTeam.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createQuotation(session: SessionContext, input: CreateQuotationInput): { quotation?: Quotation; task?: SalesTask; error?: string } {
  const error = customerError(session, input.customerId);
  if (error) return { error };
  if (!input.productName.trim()) return { error: '请填写报价产品。' };
  const quantity = money(input.quantity);
  const unitPrice = money(input.unitPrice);
  if (quantity <= 0 || unitPrice <= 0) return { error: '数量和单价必须大于 0。' };
  const state = loadState();
  const version = state.quotations.filter((quotation) => quotation.team_id === session.currentTeam.id && quotation.customerId === input.customerId).length + 1;
  const productAmount = money(quantity * unitPrice);
  const freightFee = money(input.freightFee);
  const installationFee = money(input.installationFee);
  const designFee = money(input.designFee);
  const discountAmount = money(input.discountAmount);
  const totalAmount = money(productAmount + freightFee + installationFee + designFee - discountAmount);
  const lineItem: QuotationLineItem = {
    id: createId(),
    productName: input.productName.trim(),
    specification: input.specification?.trim() ?? '',
    quantity,
    unitPrice,
    subtotal: productAmount,
    remark: input.remark?.trim() ?? '',
  };
  const quotation: Quotation = {
    id: createId(),
    team_id: session.currentTeam.id,
    customerId: input.customerId,
    version,
    status: '已发送',
    productAmount,
    freightFee,
    installationFee,
    designFee,
    discountAmount,
    totalAmount,
    lineItems: [lineItem],
    feedback: '',
    createdAt: now(),
  };
  state.quotations.push(quotation);
  saveState(state);
  const task = createTask(session, { customerId: input.customerId, title: '确认客户是否接受报价，并记录异议或修改意见', dueAt: dayOffset(0), source: '报价生成', relatedId: quotation.id }).task;
  return { quotation, task };
}

export function confirmQuotation(session: SessionContext, quotationId: string): { quotation?: Quotation; error?: string } {
  const state = loadState();
  const quotation = state.quotations.find((item) => item.team_id === session.currentTeam.id && item.id === quotationId);
  if (!quotation) return { error: '报价不存在或不属于当前团队。' };
  quotation.status = '客户确认';
  quotation.confirmedAt = now();
  saveState(state);
  return { quotation };
}

export function getMvpDashboard(session: SessionContext) {
  const state = loadState();
  const tasks = state.tasks.filter((task) => task.team_id === session.currentTeam.id);
  const quotations = state.quotations.filter((quotation) => quotation.team_id === session.currentTeam.id);
  const orders = loadOrderSnapshot().orders.filter((order) => order.team_id === session.currentTeam.id);
  const nodes = orders.flatMap((order) => order.receivableNodes);
  return {
    pendingTasks: tasks.filter((task) => task.status === '待处理').length,
    quotations: quotations.length,
    confirmedQuotations: quotations.filter((quotation) => quotation.status === '客户确认').length,
    orders: orders.length,
    receivableAmount: money(nodes.reduce((total, node) => total + node.plannedAmount, 0)),
    receivedAmount: money(nodes.reduce((total, node) => total + node.receivedAmount, 0)),
  };
}

export function resetMvpFlowState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
