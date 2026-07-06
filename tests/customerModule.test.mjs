import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomer, findCustomerDuplicates, listCustomers, parseDemandPhrase } from '../dist/api/customers.js';
import { resetDevelopmentState, saveDevelopmentState } from '../dist/api/devAuth.js';

function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

function session(teamId, userId = 'user_a') {
  return {
    user: { id: userId, name: '测试用户', isDevelopmentUser: true, createdAt: new Date().toISOString() },
    currentTeam: { id: teamId, name: '测试团队', kind: 'team', ownerUserId: userId, createdAt: new Date().toISOString() },
    member: { id: 'member', team_id: teamId, userId, roleId: 'role', displayName: '测试用户', joinedAt: new Date().toISOString() },
    role: { id: 'role', team_id: teamId, code: 'owner', name: '负责人', description: '', permissions: [] },
  };
}

function seedState() {
  saveDevelopmentState({
    teams: [],
    roles: [],
    members: [],
    configs: [{ id: crypto.randomUUID(), team_id: 'team_a', customerStages: ['线索'], customerSources: ['微信转介绍'], riskTags: [], taskTypes: [], quotationFeeItems: [], fileTypes: [], storeTypes: ['便利店'], shelfProductCategories: [], createdAt: new Date().toISOString() }],
    onboarding: [],
    logs: [],
    customers: [],
    ownershipHistory: [],
  });
}

function input(overrides = {}) {
  return {
    name: '华东便利店项目',
    contactName: '王总',
    phone: '13800000000',
    wechat: 'shelf-wang',
    city: '上海',
    address: '浦东新区张江路 1 号',
    storeType: '便利店',
    storeArea: '80㎡',
    demandText: '80㎡便利店货架',
    source: '微信转介绍',
    nextFollowTime: '',
    ...overrides,
  };
}

installLocalStorage();

test('parses quick demand phrase without AI', () => {
  assert.deepEqual(parseDemandPhrase('80㎡便利店货架'), {
    demandText: '80㎡便利店货架',
    storeArea: '80㎡',
    storeType: '便利店',
  });
});

test('creates customer with team_id and ownership history/log side effects', () => {
  resetDevelopmentState();
  seedState();
  const result = createCustomer(session('team_a'), input());
  assert.equal(result.customer?.team_id, 'team_a');
  assert.equal(listCustomers(session('team_a')).length, 1);
});

test('detects duplicates only inside current team', () => {
  resetDevelopmentState();
  seedState();
  createCustomer(session('team_a'), input());
  const duplicate = findCustomerDuplicates(session('team_a'), input({ name: '其他项目' }));
  const otherTeamDuplicate = findCustomerDuplicates(session('team_b'), input({ name: '其他项目' }));
  assert.equal(duplicate.length, 1);
  assert.equal(otherTeamDuplicate.length, 0);
});
