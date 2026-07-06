import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomer, resetCustomerModuleState } from '../dist/api/customers.js';
import { createTask, completeTask, createQuotation, confirmQuotation, listTasks, listQuotations, resetMvpFlowState } from '../dist/api/mvpFlow.js';
import { createOrderFromQuotation, listOrders, resetOrderFlowState } from '../dist/api/orderFlow.js';
import { recordCollection } from '../dist/api/collectionFlow.js';

globalThis.localStorage = {
  store: new Map(),
  getItem(key) { return this.store.get(key) ?? null; },
  setItem(key, value) { this.store.set(key, String(value)); },
  removeItem(key) { this.store.delete(key); },
  clear() { this.store.clear(); },
};

const session = {
  user: { id: 'user_a', name: 'sales_a', isDevelopmentUser: true, createdAt: 'now' },
  currentTeam: { id: 'team_a', name: 'team_a', kind: 'team', ownerUserId: 'user_a', createdAt: 'now' },
  member: { id: 'member_a', team_id: 'team_a', userId: 'user_a', roleId: 'role_a', displayName: 'sales_a', joinedAt: 'now' },
  role: { id: 'role_a', team_id: 'team_a', code: 'owner', name: 'owner', description: '', permissions: [] },
};

function resetAll() {
  resetCustomerModuleState();
  resetMvpFlowState();
  resetOrderFlowState();
}

function makeCustomer() {
  const result = createCustomer(session, { name: 'store project', phone: '13800000000', demandText: '80㎡便利店货架' });
  assert.ok(result.customer);
  return result.customer;
}

test('creates and completes a task', () => {
  resetAll();
  const customer = makeCustomer();
  const created = createTask(session, { customerId: customer.id, title: 'call customer' });
  assert.equal(created.error, undefined);
  assert.equal(listTasks(session).length, 1);
  completeTask(session, created.task.id);
  assert.equal(listTasks(session)[0].status, '已完成');
});

test('creates and confirms a quotation with follow-up task', () => {
  resetAll();
  const customer = makeCustomer();
  const result = createQuotation(session, { customerId: customer.id, productName: 'main shelf', quantity: 2, unitPrice: 1000, freightFee: 200 });
  assert.equal(result.error, undefined);
  assert.equal(result.quotation.totalAmount, 2200);
  assert.equal(listTasks(session).length, 1);
  confirmQuotation(session, result.quotation.id);
  assert.equal(listQuotations(session)[0].status, '客户确认');
});

test('creates order from confirmed quotation and records collection', () => {
  resetAll();
  const customer = makeCustomer();
  const quotation = createQuotation(session, { customerId: customer.id, productName: 'main shelf', quantity: 2, unitPrice: 1000 }).quotation;
  confirmQuotation(session, quotation.id);
  const orderResult = createOrderFromQuotation(session, { customerId: customer.id, quotationId: quotation.id, depositAmount: 500, finalPaymentAmount: 1500 });
  assert.equal(orderResult.error, undefined);
  assert.equal(listOrders(session).length, 1);
  assert.equal(orderResult.tasks.length, 2);
  assert.equal(listTasks(session).filter((task) => task.source === '订单生成' || task.source === '回款生成').length, 2);
  const order = orderResult.order;
  const node = order.receivableNodes[0];
  const collection = recordCollection(session, { orderId: order.id, nodeId: node.id, amount: 500, method: 'cash' });
  assert.equal(collection.error, undefined);
  assert.equal(collection.order.receivableNodes[0].status, '已收款');
  const depositTask = listTasks(session).find((task) => task.title.includes('定金'));
  assert.equal(depositTask.status, '已完成');
});
