import { appendOperationLog, getDevelopmentState, saveDevelopmentState } from './devAuth.js';
import type {
  Customer,
  CustomerDuplicateMatch,
  CustomerLevel,
  CustomerOwnershipHistory,
  SessionContext,
} from '../domain/models.js';
import { assertTeamScope, currentTeamId, rejectClientProvidedTeamId, scopeByCurrentTeam } from '../domain/teamIsolation.js';

export interface CustomerCreateInput {
  name: string;
  contactName: string;
  phone: string;
  wechat: string;
  city: string;
  address: string;
  storeType: string;
  storeArea: string;
  demandText: string;
  source: string;
  nextFollowTime: string;
  level?: CustomerLevel;
}

export interface ParsedDemandPhrase {
  demandText: string;
  storeArea?: string;
  storeType?: string;
}

const STORE_TYPE_KEYWORDS = ['便利店', '超市', '药店', '仓库', '母婴店', '文具店', '烟酒店'];

function now(): string {
  return new Date().toISOString();
}

function createId(): string {
  return crypto.randomUUID();
}

function normalize(value: string): string {
  return value.trim();
}

export function parseDemandPhrase(phrase: string): ParsedDemandPhrase {
  const demandText = normalize(phrase);
  const areaMatch = demandText.match(/(\d+(?:\.\d+)?)\s*㎡/);
  const storeType = STORE_TYPE_KEYWORDS.find((keyword) => demandText.includes(keyword));

  return {
    demandText,
    storeArea: areaMatch ? `${areaMatch[1]}㎡` : undefined,
    storeType,
  };
}

export function listCustomers(session: SessionContext): Customer[] {
  const state = getDevelopmentState();
  return scopeByCurrentTeam(session, state.customers).filter((customer) => !customer.archivedAt);
}

export function getCustomer(session: SessionContext, customerId: string): Customer | undefined {
  const customer = getDevelopmentState().customers.find((candidate) => candidate.id === customerId);
  return customer ? assertTeamScope(session, customer) : undefined;
}

export function listOwnershipHistory(session: SessionContext, customerId: string): CustomerOwnershipHistory[] {
  return scopeByCurrentTeam(session, getDevelopmentState().ownershipHistory).filter(
    (entry) => entry.customerId === customerId,
  );
}

export function findCustomerDuplicates(session: SessionContext, input: CustomerCreateInput): CustomerDuplicateMatch[] {
  rejectClientProvidedTeamId(input as unknown as Record<string, unknown>);
  const candidates = listCustomers(session);
  const normalizedPhone = normalize(input.phone);
  const normalizedWechat = normalize(input.wechat);
  const normalizedName = normalize(input.name);
  const normalizedCity = normalize(input.city);
  const normalizedAddress = normalize(input.address);

  return candidates
    .map((customer) => {
      const reasons: string[] = [];
      if (normalizedPhone && normalize(customer.phone) === normalizedPhone) reasons.push('手机号完全相同');
      if (normalizedWechat && normalize(customer.wechat) === normalizedWechat) reasons.push('微信号完全相同');
      if (normalizedName && normalizedCity && normalize(customer.name) === normalizedName && normalize(customer.city) === normalizedCity) {
        reasons.push('客户名称和城市相同');
      }
      const customerAddress = normalize(customer.address);
      if (
        normalizedAddress &&
        customerAddress &&
        (customerAddress.includes(normalizedAddress) || normalizedAddress.includes(customerAddress))
      ) {
        reasons.push('详细地址相似');
      }

      return reasons.length ? { customer, reasons } : undefined;
    })
    .filter((match): match is CustomerDuplicateMatch => Boolean(match));
}

export function createCustomer(
  session: SessionContext,
  input: CustomerCreateInput,
  options: { ignoreDuplicateWarning?: boolean } = {},
): { customer?: Customer; duplicates: CustomerDuplicateMatch[] } {
  rejectClientProvidedTeamId(input as unknown as Record<string, unknown>);
  const duplicates = findCustomerDuplicates(session, input);

  if (duplicates.length && !options.ignoreDuplicateWarning) {
    return { duplicates };
  }

  const state = getDevelopmentState();
  const timestamp = now();
  const config = state.configs.find((item) => item.team_id === currentTeamId(session));
  const customer: Customer = {
    id: createId(),
    team_id: currentTeamId(session),
    ownerUserId: session.user.id,
    name: normalize(input.name),
    contactName: normalize(input.contactName),
    phone: normalize(input.phone),
    wechat: normalize(input.wechat),
    city: normalize(input.city),
    address: normalize(input.address),
    storeType: normalize(input.storeType),
    storeArea: normalize(input.storeArea),
    demandText: normalize(input.demandText),
    source: normalize(input.source),
    stage: config?.customerStages[0] ?? '线索',
    level: input.level ?? 'B',
    riskTags: [],
    nextFollowTime: input.nextFollowTime,
    latestFollowSummary: '暂未记录跟进',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const ownershipEntry: CustomerOwnershipHistory = {
    id: createId(),
    team_id: customer.team_id,
    customerId: customer.id,
    toOwnerId: session.user.id,
    changeType: 'created',
    reason: '客户创建时自动分配给当前用户',
    operatedBy: session.user.id,
    operatedAt: timestamp,
  };

  state.customers.push(customer);
  state.ownershipHistory.push(ownershipEntry);
  appendOperationLog(state, session, options.ignoreDuplicateWarning ? 'customer_created_after_duplicate_warning' : 'customer_created', 'customer', customer.id, {
    duplicateCount: duplicates.length,
  });
  saveDevelopmentState(state);

  return { customer, duplicates };
}
