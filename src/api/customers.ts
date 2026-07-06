import type {
  CreateCustomerInput,
  Customer,
  CustomerDuplicateMatch,
  CustomerLevel,
  CustomerOwnershipHistory,
  CustomerStage,
  DemandPhraseParseResult,
  DuplicateReason,
  OperationLog,
  SessionContext,
} from '../domain/models.js';

const STORAGE_KEY = 'shelf-crm-customer-module-state-v1';

interface CustomerModuleState {
  customers: Customer[];
  ownershipHistory: CustomerOwnershipHistory[];
  logs: OperationLog[];
}

const DEFAULT_STAGE: CustomerStage = '线索';
const DEFAULT_LEVEL: CustomerLevel = 'C';

const STORE_TYPE_KEYWORDS = ['便利店', '超市', '药店', '仓库', '母婴店', '文具店', '烟酒店'];

function emptyState(): CustomerModuleState {
  return {
    customers: [],
    ownershipHistory: [],
    logs: [],
  };
}

function loadState(): CustomerModuleState {
  if (typeof localStorage === 'undefined') {
    return emptyState();
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
}

function saveState(state: CustomerModuleState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function now(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value?: string): string {
  return value?.trim() ?? '';
}

function normalizePhone(value?: string): string {
  return normalizeText(value).replace(/\s+/g, '');
}

function normalizeWechat(value?: string): string {
  return normalizeText(value).toLowerCase();
}

function appendLog(
  state: CustomerModuleState,
  session: SessionContext,
  action: string,
  targetId: string,
  metadata?: Record<string, unknown>,
): void {
  state.logs.push({
    id: createId(),
    team_id: session.currentTeam.id,
    actorUserId: session.user.id,
    action,
    targetType: 'customer',
    targetId,
    createdAt: now(),
    metadata,
  });
}

export function parseDemandPhrase(phrase: string): DemandPhraseParseResult {
  const demandText = normalizeText(phrase);
  const areaMatch = demandText.match(/(\d+(?:\.\d+)?)\s*㎡/);
  const storeType = STORE_TYPE_KEYWORDS.find((keyword) => demandText.includes(keyword));

  return {
    demandText,
    storeArea: areaMatch ? `${areaMatch[1]}㎡` : undefined,
    storeType,
  };
}

export function listCustomers(session: SessionContext): Customer[] {
  return loadState()
    .customers.filter((customer) => customer.team_id === session.currentTeam.id && !customer.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCustomer(session: SessionContext, customerId: string): Customer | undefined {
  return listCustomers(session).find((customer) => customer.id === customerId);
}

export function listCustomerOwnershipHistory(
  session: SessionContext,
  customerId: string,
): CustomerOwnershipHistory[] {
  return loadState()
    .ownershipHistory.filter((record) => record.team_id === session.currentTeam.id && record.customerId === customerId)
    .sort((a, b) => b.operatedAt.localeCompare(a.operatedAt));
}

export function findCustomerDuplicates(
  session: SessionContext,
  input: CreateCustomerInput,
): CustomerDuplicateMatch[] {
  const state = loadState();
  const phone = normalizePhone(input.phone);
  const wechat = normalizeWechat(input.wechat);
  const name = normalizeText(input.name);
  const city = normalizeText(input.city);
  const address = normalizeText(input.address);

  return state.customers
    .filter((customer) => customer.team_id === session.currentTeam.id && !customer.archivedAt)
    .map((customer) => {
      const reasons: DuplicateReason[] = [];
      const existingPhone = normalizePhone(customer.phone);
      const existingWechat = normalizeWechat(customer.wechat);
      const existingName = normalizeText(customer.name);
      const existingCity = normalizeText(customer.city);
      const existingAddress = normalizeText(customer.address);

      if (phone && existingPhone && phone === existingPhone) {
        reasons.push('phone');
      }

      if (wechat && existingWechat && wechat === existingWechat) {
        reasons.push('wechat');
      }

      if (name && city && existingName === name && existingCity === city) {
        reasons.push('name_city');
      }

      if (
        address &&
        existingAddress &&
        (address.includes(existingAddress) || existingAddress.includes(address))
      ) {
        reasons.push('similar_address');
      }

      return reasons.length > 0 ? { customer, reasons } : undefined;
    })
    .filter((match): match is CustomerDuplicateMatch => Boolean(match));
}

export function createCustomer(
  session: SessionContext,
  input: CreateCustomerInput,
): {
  customer?: Customer;
  duplicates: CustomerDuplicateMatch[];
  blockedByDuplicates: boolean;
} {
  const state = loadState();
  const parsedDemand = parseDemandPhrase(input.demandText ?? '');
  const duplicateMatches = findCustomerDuplicates(session, input);

  if (duplicateMatches.length > 0 && !input.ignoreDuplicateWarning) {
    return {
      duplicates: duplicateMatches,
      blockedByDuplicates: true,
    };
  }

  const createdAt = now();
  const customer: Customer = {
    id: createId(),
    team_id: session.currentTeam.id,
    ownerUserId: session.user.id,
    name: normalizeText(input.name),
    contactName: normalizeText(input.contactName),
    phone: normalizePhone(input.phone),
    wechat: normalizeText(input.wechat),
    city: normalizeText(input.city),
    address: normalizeText(input.address),
    storeType: normalizeText(input.storeType) || parsedDemand.storeType || '',
    storeArea: normalizeText(input.storeArea) || parsedDemand.storeArea || '',
    demandText: normalizeText(input.demandText),
    source: normalizeText(input.source) || '手动录入',
    stage: DEFAULT_STAGE,
    level: DEFAULT_LEVEL,
    riskTags: [],
    nextFollowTime: normalizeText(input.nextFollowTime),
    latestFollowSummary: '',
    createdAt,
    updatedAt: createdAt,
  };

  const ownershipHistory: CustomerOwnershipHistory = {
    id: createId(),
    team_id: session.currentTeam.id,
    customerId: customer.id,
    toOwnerId: session.user.id,
    changeType: 'created',
    reason: '客户创建时自动分配给当前用户',
    operatedBy: session.user.id,
    operatedAt: createdAt,
  };

  state.customers.push(customer);
  state.ownershipHistory.push(ownershipHistory);

  appendLog(state, session, 'customer_created', customer.id);

  if (duplicateMatches.length > 0 && input.ignoreDuplicateWarning) {
    appendLog(state, session, 'customer_duplicate_warning_ignored', customer.id, {
      duplicateCustomerIds: duplicateMatches.map((match) => match.customer.id),
      reasons: duplicateMatches.flatMap((match) => match.reasons),
    });
  }

  saveState(state);

  return {
    customer,
    duplicates: duplicateMatches,
    blockedByDuplicates: false,
  };
}

export function resetCustomerModuleState(): void {
  localStorage.removeItem(STORAGE_KEY);
}