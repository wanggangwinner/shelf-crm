import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomer, resetCustomerModuleState } from '../dist/api/customers.js';
import { createContact, createOpportunity, ensureCustomerFoundation, getDefaultOpportunity, listContacts, listOpportunities, resetOpportunityState } from '../dist/api/opportunities.js';
import { createFollowUp, resetFollowUpModuleState } from '../dist/api/followUps.js';
import { createQuotation, createTask, confirmQuotation, resetMvpFlowState } from '../dist/api/mvpFlow.js';
import { createOrderFromQuotation, resetOrderFlowState } from '../dist/api/orderFlow.js';

globalThis.localStorage = { store: new Map(), getItem(key) { return this.store.get(key) ?? null; }, setItem(key, value) { this.store.set(key, String(value)); }, removeItem(key) { this.store.delete(key); }, clear() { this.store.clear(); } };
const session = { user: { id: 'user_a', name: 'A', isDevelopmentUser: true, createdAt: 'now' }, currentTeam: { id: 'team_a', name: 'A', kind: 'team', ownerUserId: 'user_a', createdAt: 'now' }, member: { id: 'member_a', team_id: 'team_a', userId: 'user_a', roleId: 'role_a', displayName: 'A', joinedAt: 'now' }, role: { id: 'role_a', team_id: 'team_a', code: 'owner', name: 'owner', description: '', permissions: [] } };
const other = { ...session, currentTeam: { ...session.currentTeam, id: 'team_b' } };
function reset() { localStorage.clear(); resetCustomerModuleState(); resetOpportunityState(); resetFollowUpModuleState(); resetMvpFlowState(); resetOrderFlowState(); }
function customer() { return createCustomer(session, { name: '连锁客户', phone: '13800000000' }).customer; }

test('migration creates one idempotent default opportunity per legacy customer', () => {
  reset(); const c = customer(); ensureCustomerFoundation(session); ensureCustomerFoundation(session);
  const rows = listOpportunities(session, c.id); assert.equal(rows.length, 1); assert.equal(rows[0].name, '首次项目'); assert.equal(rows[0].stage, '线索'); assert.equal(rows[0].isDefault, true);
});

test('contact and opportunity writes derive team and reject cross-team customer', () => {
  reset(); const c = customer();
  const contact = createContact(session, { customerId: c.id, name: '李总', phone: '13900000000' });
  const project = createOpportunity(session, { customerId: c.id, name: '二店扩建' });
  assert.equal(contact.contact.team_id, 'team_a'); assert.equal(project.opportunity.team_id, 'team_a');
  assert.equal(listContacts(session, c.id).length, 1); assert.equal(listContacts(other, c.id).length, 0);
  assert.equal(createOpportunity(other, { customerId: c.id, name: '越权项目' }).error, '客户不存在或不属于当前团队。');
});

test('validates names and returns stable default opportunity', () => {
  reset(); const c = customer();
  assert.equal(createContact(session, { customerId: c.id, name: ' ' }).error, '请填写联系人姓名。');
  assert.equal(createOpportunity(session, { customerId: c.id, name: ' ' }).error, '请填写项目名称。');
  assert.equal(getDefaultOpportunity(session, c.id).id, getDefaultOpportunity(session, c.id).id);
});

test('new sales records inherit the customer default opportunity', () => {
  reset(); const c = customer(); const opportunity = getDefaultOpportunity(session, c.id);
  const followUp = createFollowUp(session, { customerId: c.id, method: '微信', rawContent: '确认尺寸' }).followUp;
  const task = createTask(session, { customerId: c.id, title: '发送方案' }).task;
  const quotation = createQuotation(session, { customerId: c.id, productName: '主架', quantity: 1, unitPrice: 1000 }).quotation;
  confirmQuotation(session, quotation.id);
  const order = createOrderFromQuotation(session, { customerId: c.id, quotationId: quotation.id, depositAmount: 300, finalPaymentAmount: 700 }).order;
  assert.equal(followUp.opportunityId, opportunity.id); assert.equal(task.opportunityId, opportunity.id); assert.equal(quotation.opportunityId, opportunity.id); assert.equal(order.opportunityId, opportunity.id);
});
