import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCustomer,
  findCustomerDuplicates,
  listCustomerOwnershipHistory,
  listCustomers,
  parseCustomerSignals,
  parseDemandPhrase,
  resetCustomerModuleState,
} from '../dist/api/customers.js';

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
  user: { id: 'user_a', name: '销售A', isDevelopmentUser: true, createdAt: 'now' },
  currentTeam: { id: 'team_a', name: '团队A', kind: 'team', ownerUserId: 'user_a', createdAt: 'now' },
  member: { id: 'member_a', team_id: 'team_a', userId: 'user_a', roleId: 'role_a', displayName: '销售A', joinedAt: 'now' },
  role: { id: 'role_a', team_id: 'team_a', code: 'owner', name: '老板/负责人', description: '', permissions: [] },
};

const sessionB = {
  ...sessionA,
  currentTeam: { id: 'team_b', name: '团队B', kind: 'team', ownerUserId: 'user_a', createdAt: 'now' },
  member: { ...sessionA.member, id: 'member_b', team_id: 'team_b' },
  role: { ...sessionA.role, id: 'role_b', team_id: 'team_b' },
};

test('parses area and store type from a quick demand phrase', () => {
  assert.deepEqual(parseDemandPhrase('80㎡便利店货架'), {
    demandText: '80㎡便利店货架',
    storeArea: '80㎡',
    storeType: '便利店',
  });
});

test('parses area variants, store type, and mobile number from a demand phrase', () => {
  assert.deepEqual(parseCustomerSignals('80平方米 超市李总 电话：15955555555 内蒙古'), {
    demandText: '80平方米 超市李总 电话：15955555555 内蒙古',
    storeArea: '80㎡',
    storeType: '超市',
    phone: '15955555555',
  });

  assert.equal(parseCustomerSignals('120平 仓库货架 13800000009').storeArea, '120㎡');
});

test('creates customer under the current team and records ownership history', () => {
  resetCustomerModuleState();

  const result = createCustomer(sessionA, {
    name: '临沂便利店项目',
    phone: '13800000000',
    city: '临沂',
    demandText: '80㎡便利店货架',
  });

  assert.equal(result.blockedByDuplicates, false);
  assert.equal(result.customer?.team_id, 'team_a');
  assert.equal(result.customer?.storeArea, '80㎡');
  assert.equal(result.customer?.storeType, '便利店');

  const customers = listCustomers(sessionA);
  assert.equal(customers.length, 1);
  assert.equal(customers[0].name, '临沂便利店项目');

  const history = listCustomerOwnershipHistory(sessionA, customers[0].id);
  assert.equal(history.length, 1);
  assert.equal(history[0].changeType, 'created');
  assert.equal(history[0].toOwnerId, 'user_a');
});

test('creates customer with phone parsed from demand phrase when phone field is empty', () => {
  resetCustomerModuleState();

  const result = createCustomer(sessionA, {
    name: '内蒙古超市项目',
    city: '内蒙古',
    demandText: '80平方米 超市李总 电话：15955555555 内蒙古',
  });

  assert.equal(result.blockedByDuplicates, false);
  assert.equal(result.customer?.phone, '15955555555');
  assert.equal(result.customer?.storeArea, '80㎡');
  assert.equal(result.customer?.storeType, '超市');
});

test('detects duplicates by phone, wechat, name plus city, and similar address in same team', () => {
  resetCustomerModuleState();

  createCustomer(sessionA, {
    name: '兰山便利店',
    phone: '13800000001',
    wechat: 'ShelfBoss',
    city: '临沂',
    address: '兰山区人民广场东侧',
    demandText: '60㎡便利店货架',
  });

  const matches = findCustomerDuplicates(sessionA, {
    name: '兰山便利店',
    phone: '13800000001',
    wechat: 'shelfboss',
    city: '临沂',
    address: '人民广场东侧',
  });

  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].reasons.sort(), ['name_city', 'phone', 'similar_address', 'wechat'].sort());
});

test('detects duplicate phone parsed from demand phrase', () => {
  resetCustomerModuleState();

  createCustomer(sessionA, {
    name: '内蒙古超市',
    phone: '15955555555',
    city: '内蒙古',
  });

  const matches = findCustomerDuplicates(sessionA, {
    name: '内蒙古超市二店',
    demandText: '80平方米 超市李总 电话：15955555555 内蒙古',
  });

  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].reasons, ['phone']);
});

test('blocks duplicate creation unless override flag is provided', () => {
  resetCustomerModuleState();

  createCustomer(sessionA, {
    name: '河东超市',
    phone: '13800000002',
    city: '临沂',
  });

  const blocked = createCustomer(sessionA, {
    name: '河东超市二店',
    phone: '13800000002',
    city: '临沂',
  });

  assert.equal(blocked.blockedByDuplicates, true);
  assert.equal(blocked.customer, undefined);
  assert.equal(listCustomers(sessionA).length, 1);

  const overridden = createCustomer(sessionA, {
    name: '河东超市二店',
    phone: '13800000002',
    city: '临沂',
    ignoreDuplicateWarning: true,
  });

  assert.equal(overridden.blockedByDuplicates, false);
  assert.equal(listCustomers(sessionA).length, 2);
});

test('does not detect duplicates across different teams', () => {
  resetCustomerModuleState();

  createCustomer(sessionA, {
    name: '跨团队客户',
    phone: '13800000003',
    city: '临沂',
  });

  const matches = findCustomerDuplicates(sessionB, {
    name: '跨团队客户',
    phone: '13800000003',
    city: '临沂',
  });

  assert.equal(matches.length, 0);
});
