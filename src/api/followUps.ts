import type {
  CreateFollowUpInput,
  FollowUpAiDraft,
  FollowUpMethod,
  FollowUpRecord,
  OperationLog,
  SessionContext,
} from '../domain/models.js';
import { getCustomer } from './customers.js';
import { getDefaultOpportunity, getOpportunity } from './opportunities.js';

const STORAGE_KEY = 'shelf-crm-follow-up-module-state-v1';

interface FollowUpModuleState {
  followUps: FollowUpRecord[];
  logs: OperationLog[];
}

function emptyState(): FollowUpModuleState {
  return {
    followUps: [],
    logs: [],
  };
}

function loadState(): FollowUpModuleState {
  if (typeof localStorage === 'undefined') {
    return emptyState();
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
}

function saveState(state: FollowUpModuleState): void {
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

function appendLog(
  state: FollowUpModuleState,
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
    targetType: 'follow_up',
    targetId,
    createdAt: now(),
    metadata,
  });
}

function includesAny(text: string, words: string[]): string[] {
  return words.filter((word) => text.includes(word));
}

export function generateFollowUpAiDraft(rawContent: string): FollowUpAiDraft {
  const raw = normalizeText(rawContent);
  const compact = raw.replace(/\s+/g, ' ');
  const budgetSignals = includesAny(compact, ['贵', '预算', '便宜', '价格', '报价']);
  const materialSignals = includesAny(compact, ['尺寸', '图纸', '照片', '现场', '平面图', '资料']);
  const competitorSignals = includesAny(compact, ['对比', '别家', '同行', '竞争', '再看看']);
  const urgencySignals = includesAny(compact, ['开业', '装修', '着急', '尽快', '明天', '今天']);
  const blockers = [...budgetSignals, ...materialSignals, ...competitorSignals].slice(0, 5);
  const objections = [...budgetSignals, ...competitorSignals].slice(0, 5);
  const nextAction = materialSignals.length
    ? '确认现场尺寸、照片或平面图是否齐全，并提醒客户补充缺失资料。'
    : budgetSignals.length
      ? '确认客户预算区间，解释产品、运输、安装等费用构成。'
      : urgencySignals.length
        ? '确认开业/装修时间，优先推进方案和报价。'
        : '确认客户需求细节，并约定下一次跟进时间。';

  return {
    summary: compact.length > 80 ? `${compact.slice(0, 80)}...` : compact,
    objections,
    blockers,
    nextAction,
    confidence: raw ? 0.72 : 0,
  };
}

export function listFollowUps(session: SessionContext, customerId: string): FollowUpRecord[] {
  const customer = getCustomer(session, customerId);

  if (!customer) {
    return [];
  }

  return loadState()
    .followUps.filter((followUp) => followUp.team_id === session.currentTeam.id && followUp.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createFollowUp(
  session: SessionContext,
  input: CreateFollowUpInput,
): {
  followUp?: FollowUpRecord;
  error?: string;
} {
  const customer = getCustomer(session, input.customerId);

  if (!customer) {
    return { error: '客户不存在或不属于当前团队。' };
  }

  const rawContent = normalizeText(input.rawContent);

  if (!rawContent) {
    return { error: '请填写原始跟进内容。' };
  }

  const opportunity = input.opportunityId ? getOpportunity(session, input.opportunityId) : getDefaultOpportunity(session, customer.id);
  if (!opportunity || opportunity.customerId !== customer.id) return { error: '项目不存在或不属于当前客户。' };
  const state = loadState();
  const draft = generateFollowUpAiDraft(rawContent);
  const createdAt = now();
  const method: FollowUpMethod = input.method ?? '微信';
  const followUp: FollowUpRecord = {
    id: createId(),
    team_id: session.currentTeam.id,
    customerId: customer.id,
    opportunityId: opportunity.id,
    ownerUserId: session.user.id,
    method,
    rawContent,
    summary: normalizeText(input.summary) || draft.summary,
    objections: draft.objections,
    blockers: draft.blockers,
    nextAction: normalizeText(input.nextAction) || draft.nextAction,
    nextFollowTime: normalizeText(input.nextFollowTime),
    createdAt,
    updatedAt: createdAt,
  };

  state.followUps.push(followUp);
  appendLog(state, session, 'follow_up_created', followUp.id, {
    customerId: customer.id,
    method,
  });
  saveState(state);

  return { followUp };
}

export function resetFollowUpModuleState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
