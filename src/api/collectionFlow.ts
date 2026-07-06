import type { CreatePaymentInput, PaymentRecord, SalesOrder, SessionContext } from '../domain/models.js';

const STORAGE_KEY = 'shelf-crm-order-flow-state-v1';

interface OrderFlowState { orders: SalesOrder[] }
function emptyState(): OrderFlowState { return { orders: [] }; }
function loadState(): OrderFlowState { if (typeof localStorage === 'undefined') return emptyState(); const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState(); }
function saveState(state: OrderFlowState): void { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function now(): string { return new Date().toISOString(); }
function createId(): string { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function money(value: unknown): number { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100) / 100) : 0; }

export function recordCollection(session: SessionContext, input: CreatePaymentInput): { order?: SalesOrder; record?: PaymentRecord; error?: string } {
  const state = loadState();
  const order = state.orders.find((item) => item.team_id === session.currentTeam.id && item.id === input.orderId);
  if (!order) return { error: '订单不存在或不属于当前团队。' };
  const node = order.receivableNodes.find((item) => item.id === input.nodeId);
  if (!node) return { error: '收款节点不存在。' };
  const amount = money(input.amount);
  if (amount <= 0) return { error: '收款金额必须大于 0。' };
  const record: PaymentRecord = { id: createId(), nodeId: node.id, amount, paidAt: now(), method: input.method?.trim() || '未填写', note: input.note?.trim() ?? '' };
  node.receivedAmount = money(node.receivedAmount + amount);
  node.status = node.receivedAmount >= node.plannedAmount ? '已收款' : '部分收款';
  order.payments.push(record);
  order.status = order.receivableNodes.every((item) => item.status === '已收款') ? '已完成' : node.title === '定金' && node.status === '已收款' ? '待尾款' : order.status;
  order.updatedAt = now();
  saveState(state);
  return { order, record };
}
