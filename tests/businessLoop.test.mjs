import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomer, resetCustomerModuleState } from '../dist/api/customers.js';
import { createFollowUp, resetFollowUpModuleState } from '../dist/api/followUps.js';
import { createQuotation, copyQuotationVersion, updateQuotationDraft, sendQuotation, confirmQuotation, listQuotations, resetMvpFlowState } from '../dist/api/mvpFlow.js';
import { createOrderFromQuotation, resetOrderFlowState } from '../dist/api/orderFlow.js';
import { recordCollection } from '../dist/api/collectionFlow.js';
import { bindFileAsset, listFileAssets, resetFileAssetState } from '../dist/api/fileAssets.js';
import { listCustomerTimeline } from '../dist/api/customerTimeline.js';

globalThis.localStorage = {
  store: new Map(), getItem(key) { return this.store.get(key) ?? null; },
  setItem(key, value) { this.store.set(key, String(value)); }, removeItem(key) { this.store.delete(key); }, clear() { this.store.clear(); },
};

const session = {
  user: { id: 'user_a', name: 'sales_a', isDevelopmentUser: true, createdAt: 'now' },
  currentTeam: { id: 'team_a', name: 'team_a', kind: 'team', ownerUserId: 'user_a', createdAt: 'now' },
  member: { id: 'member_a', team_id: 'team_a', userId: 'user_a', roleId: 'role_a', displayName: 'sales_a', joinedAt: 'now' },
  role: { id: 'role_a', team_id: 'team_a', code: 'owner', name: 'owner', description: '', permissions: [] },
};
const otherSession = { ...session, currentTeam: { ...session.currentTeam, id: 'team_b' } };

function resetAll() { localStorage.clear(); resetCustomerModuleState(); resetFollowUpModuleState(); resetMvpFlowState(); resetOrderFlowState(); resetFileAssetState(); }
function customer() { return createCustomer(session, { name: 'Project A', phone: '13800000000', demandText: '80 square meter shelf store' }).customer; }

test('creates a multi-line quotation and copies an editable next version', () => {
  resetAll(); const c = customer();
  const created = createQuotation(session, { customerId: c.id, lineItems: [
    { productName: 'Main shelf', quantity: 2, unitPrice: 1000 },
    { productName: 'End shelf', quantity: 1, unitPrice: 500 },
  ], freightFee: 200, discountAmount: 100 });
  assert.equal(created.error, undefined); assert.equal(created.quotation.productAmount, 2500); assert.equal(created.quotation.totalAmount, 2600);
  const copied = copyQuotationVersion(session, created.quotation.id);
  assert.equal(copied.quotation.version, 2); assert.equal(copied.quotation.copiedFromId, created.quotation.id);
  const edited = updateQuotationDraft(session, copied.quotation.id, { lineItems: [{ productName: 'Main shelf', quantity: 3, unitPrice: 900 }], freightFee: 0 });
  assert.equal(edited.quotation.totalAmount, 2600);
  sendQuotation(session, copied.quotation.id); confirmQuotation(session, copied.quotation.id);
  assert.equal(updateQuotationDraft(session, copied.quotation.id, { freightFee: 10 }).error, '只有草稿报价可以修改，请复制为新版本。');
});

test('prevents duplicate orders and over-collection', () => {
  resetAll(); const c = customer();
  const q = createQuotation(session, { customerId: c.id, productName: 'Shelf', quantity: 1, unitPrice: 1000 }).quotation; sendQuotation(session, q.id); confirmQuotation(session, q.id);
  const first = createOrderFromQuotation(session, { customerId: c.id, quotationId: q.id, depositAmount: 300, finalPaymentAmount: 700 });
  assert.equal(createOrderFromQuotation(session, { customerId: c.id, quotationId: q.id, depositAmount: 300, finalPaymentAmount: 700 }).error, '该报价已经生成订单，请勿重复操作。');
  const node = first.order.receivableNodes[0];
  assert.equal(recordCollection(session, { orderId: first.order.id, nodeId: node.id, amount: 301 }).error, '收款金额不能超过该节点剩余应收金额。');
});

test('binds files and aggregates a team-isolated customer timeline', () => {
  resetAll(); const c = customer();
  createFollowUp(session, { customerId: c.id, method: '微信', rawContent: 'Customer asked for a revised quote.' });
  const q = createQuotation(session, { customerId: c.id, productName: 'Shelf', quantity: 1, unitPrice: 1000 }).quotation;
  sendQuotation(session, q.id);
  const file = bindFileAsset(session, { customerId: c.id, targetType: 'customer', targetId: c.id, fileName: 'site-photo.jpg', fileType: 'image/jpeg', size: 1234, note: 'Site photo' });
  assert.equal(file.error, undefined); assert.equal(listFileAssets(session, c.id).length, 1); assert.equal(listFileAssets(otherSession, c.id).length, 0);
  const timeline = listCustomerTimeline(session, c.id);
  assert.deepEqual(new Set(timeline.map((event) => event.type)), new Set(['follow_up', 'task', 'quotation', 'file']));
  assert.ok(timeline.every((event, index) => index === 0 || timeline[index - 1].occurredAt >= event.occurredAt));
  assert.equal(listCustomerTimeline(otherSession, c.id).length, 0);
  assert.ok(listQuotations(session).some((item) => item.id === q.id));
});
