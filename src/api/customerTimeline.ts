import type { CustomerTimelineEvent, SessionContext } from '../domain/models.js';
import { getCustomer } from './customers.js';
import { listFollowUps } from './followUps.js';
import { listFileAssets } from './fileAssets.js';
import { listQuotations, listTasks } from './mvpFlow.js';
import { listOrders } from './orderFlow.js';

export function listCustomerTimeline(session: SessionContext, customerId: string): CustomerTimelineEvent[] {
  if (!getCustomer(session, customerId)) return [];
  const base = { team_id: session.currentTeam.id, customerId };
  const events: CustomerTimelineEvent[] = [
    ...listFollowUps(session, customerId).map((item) => ({ ...base, id: `follow-up:${item.id}`, type: 'follow_up' as const, title: `${item.method}跟进`, detail: item.summary || item.rawContent, occurredAt: item.createdAt, relatedId: item.id })),
    ...listTasks(session).filter((item) => item.customerId === customerId).map((item) => ({ ...base, id: `task:${item.id}`, type: 'task' as const, title: item.title, detail: `${item.status} · 到期 ${item.dueAt}`, occurredAt: item.completedAt || item.createdAt, relatedId: item.id })),
    ...listQuotations(session).filter((item) => item.customerId === customerId).map((item) => ({ ...base, id: `quotation:${item.id}`, type: 'quotation' as const, title: `报价 V${item.version}`, detail: `${item.status} · ¥${item.totalAmount.toFixed(2)}`, occurredAt: item.confirmedAt || item.updatedAt || item.createdAt, relatedId: item.id })),
    ...listOrders(session).filter((item) => item.customerId === customerId).flatMap((order) => [
      { ...base, id: `order:${order.id}`, type: 'order' as const, title: '生成订单', detail: `${order.status} · ¥${order.orderAmount.toFixed(2)}`, occurredAt: order.createdAt, relatedId: order.id },
      ...order.payments.map((payment) => ({ ...base, id: `payment:${payment.id}`, type: 'payment' as const, title: '记录收款', detail: `${payment.method} · ¥${payment.amount.toFixed(2)}`, occurredAt: payment.paidAt, relatedId: payment.id })),
    ]),
    ...listFileAssets(session, customerId).map((item) => ({ ...base, id: `file:${item.id}`, type: 'file' as const, title: `文件：${item.fileName}`, detail: item.note || item.fileType, occurredAt: item.createdAt, relatedId: item.id })),
  ];
  return events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
