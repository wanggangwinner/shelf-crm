import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomer, resetCustomerModuleState } from '../dist/api/customers.js';
import {
  createFollowUp,
  generateFollowUpAiDraft,
  listFollowUps,
  resetFollowUpModuleState,
} from '../dist/api/followUps.js';

globalThis.localStorage = {
  store: new Map(),
  getItem(key) {
    return this.store.get(key) ?? null;
  },
  setItem(key, value) {
    this.store.set(key, String(value));
  },
  removeItem(key) {
    this.store.delete(key);
  },
  clear() {
    this.store.clear();
  },
};

const sessionA = {
  user: { id: 'user_a', name: 'sales_a', isDevelopmentUser: true, createdAt: 'now' },
  currentTeam: { id: 'team_a', name: 'team_a', kind: 'team', ownerUserId: 'user_a', createdAt: 'now' },
  member: { id: 'member_a', team_id: 'team_a', userId: 'user_a', roleId: 'role_a', displayName: 'sales_a', joinedAt: 'now' },
  role: { id: 'role_a', team_id: 'team_a', code: 'owner', name: 'owner', description: '', permissions: [] },
};

const sessionB = {
  ...sessionA,
  currentTeam: { id: 'team_b', name: 'team_b', kind: 'team', ownerUserId: 'user_a', createdAt: 'now' },
  member: { ...sessionA.member, id: 'member_b', team_id: 'team_b' },
  role: { ...sessionA.role, id: 'role_b', team_id: 'team_b' },
};

function createBaseCustomer() {
  const result = createCustomer(sessionA, {
    name: 'store shelf project',
    phone: '13800000000',
    city: 'linyi',
    demandText: '80sqm convenience store shelf',
  });

  if (!result.customer) {
    throw new Error('customer should be created');
  }

  return result.customer;
}

test('generates lightweight draft from raw follow-up content', () => {
  const draft = generateFollowUpAiDraft('customer says price is expensive and will send site photos tomorrow');

  assert.match(draft.summary, /price/);
  assert.ok(draft.nextAction.length > 0);
  assert.equal(draft.confidence, 0.72);
});

test('creates follow-up under the current team and customer', () => {
  resetCustomerModuleState();
  resetFollowUpModuleState();
  const customer = createBaseCustomer();

  const result = createFollowUp(sessionA, {
    customerId: customer.id,
    method: '微信',
    rawContent: '客户说预算有限，想先看80㎡便利店货架报价。',
  });

  assert.equal(result.error, undefined);
  assert.equal(result.followUp?.team_id, 'team_a');
  assert.equal(result.followUp?.customerId, customer.id);

  const followUps = listFollowUps(sessionA, customer.id);
  assert.equal(followUps.length, 1);
  assert.equal(followUps[0].rawContent, '客户说预算有限，想先看80㎡便利店货架报价。');
});

test('rejects cross-team follow-up writes', () => {
  resetCustomerModuleState();
  resetFollowUpModuleState();
  const customer = createBaseCustomer();

  const result = createFollowUp(sessionB, {
    customerId: customer.id,
    method: '电话',
    rawContent: 'cross team should not write',
  });

  assert.equal(result.error, '客户不存在或不属于当前团队。');
  assert.equal(listFollowUps(sessionB, customer.id).length, 0);
});

test('requires raw follow-up content', () => {
  resetCustomerModuleState();
  resetFollowUpModuleState();
  const customer = createBaseCustomer();

  const result = createFollowUp(sessionA, {
    customerId: customer.id,
    method: '面谈',
    rawContent: '   ',
  });

  assert.equal(result.error, '请填写原始跟进内容。');
  assert.equal(listFollowUps(sessionA, customer.id).length, 0);
});
