import type { CreateOrderInput, ReceivableNode, SalesOrder, SalesTask, SessionContext } from '../domain/models.js';
import { getCustomer } from './customers.js';
import { createTask, listQuotations, markQuotationConverted } from './mvpFlow.js';

const STORAGE_KEY = 'shelf-crm-order-flow-state-v1';

interface OrderFlowState {
  orders: SalesOrder[];
}

function emptyState(): OrderFlowState { return { orders: [] }; }
function loadState(): OrderFlowState { if (typeof localStorage === 'undefined') return emptyState(); const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState(); }
function saveState(state: OrderFlowState): void { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function now(): string { return new Date().toISOString(); }
function createId(): string { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function dayOffset(days: number): string { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function money(value: unknown): number { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100) / 100) : 0; }

export function listOrders(session: SessionContext): SalesOrder[] {
  return loadState().orders.filter((order) => order.team_id === session.currentTeam.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createOrderFromQuotation(session: SessionContext, input: CreateOrderInput): { order?: SalesOrder; tasks?: SalesTask[]; error?: string } {
  if (!getCustomer(session, input.customerId)) return { error: '客户不存在或不属于当前团队。' };
  const quotation = listQuotations(session).find((item) => item.id === input.quotationId && item.customerId === input.customerId);
  if (!quotation) return { error: '报价不存在或不属于当前客户。' };
  if (loadState().orders.some((order) => order.team_id === session.currentTeam.id && order.quotationId === input.quotationId)) return { error: '该报价已经生成订单，请勿重复操作。' };
  if (quotation.status !== '客户确认') return { error: '报价需要先标记为客户确认，才能转订单。' };
  const depositAmount = money(input.depositAmount);
  const finalPaymentAmount = money(input.finalPaymentAmount);
  if (depositAmount + finalPaymentAmount <= 0) return { error: '请填写定金或尾款金额。' };
  const nodes: ReceivableNode[] = [
    { id: createId(), title: '定金', plannedAmount: depositAmount, receivedAmount: 0, dueAt: input.depositDueAt || dayOffset(0), status: depositAmount > 0 ? '待收款' : '已收款' },
    { id: createId(), title: '尾款', plannedAmount: finalPaymentAmount, receivedAmount: 0, dueAt: input.finalDueAt || dayOffset(7), status: finalPaymentAmount > 0 ? '待收款' : '已收款' },
  ];
  const order: SalesOrder = { id: createId(), team_id: session.currentTeam.id, customerId: input.customerId, opportunityId: quotation.opportunityId, quotationId: input.quotationId, orderAmount: money(depositAmount + finalPaymentAmount), status: depositAmount > 0 ? '待收定金' : '待尾款', receivableNodes: nodes, payments: [], createdAt: now(), updatedAt: now() };
  const state = loadState();
  state.orders.push(order);
  saveState(state);
  markQuotationConverted(session, quotation.id);

  const tasks = order.receivableNodes
    .filter((node) => node.plannedAmount > 0)
    .map((node) => createTask(session, {
      customerId: order.customerId,
      opportunityId: order.opportunityId,
      title: `收取${node.title} ${money(node.plannedAmount)} 元`,
      dueAt: node.dueAt,
      source: node.title === '定金' ? '订单生成' : '回款生成',
      relatedId: order.id,
    }).task)
    .filter((task): task is SalesTask => Boolean(task));

  return { order, tasks };
}

export function resetOrderFlowState(): void { localStorage.removeItem(STORAGE_KEY); }
