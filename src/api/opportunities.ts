import type { Contact, CreateContactInput, CreateOpportunityInput, Opportunity, SessionContext } from '../domain/models.js';
import { getCustomer, listCustomers } from './customers.js';

const STORAGE_KEY = 'shelf-crm-domain-foundation-state-v1';
interface State { version: 1; contacts: Contact[]; opportunities: Opportunity[] }
const emptyState = (): State => ({ version: 1, contacts: [], opportunities: [] });
function loadState(): State { if (typeof localStorage === 'undefined') return emptyState(); const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState(); }
function saveState(state: State): void { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const now = () => new Date().toISOString();
const createId = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
function defaultOpportunity(session: SessionContext, customerId: string): Opportunity { const timestamp = now(); return { id: createId(), team_id: session.currentTeam.id, customerId, name: '首次项目', stage: '线索', ownerUserId: session.user.id, collaboratorUserIds: [], isDefault: true, createdAt: timestamp, updatedAt: timestamp }; }

export function ensureCustomerFoundation(session: SessionContext): void {
  const state = loadState(); let changed = false;
  for (const customer of listCustomers(session)) if (!state.opportunities.some((item) => item.team_id === session.currentTeam.id && item.customerId === customer.id && item.isDefault)) { state.opportunities.push(defaultOpportunity(session, customer.id)); changed = true; }
  if (changed) saveState(state);
}
export function listContacts(session: SessionContext, customerId: string): Contact[] { if (!getCustomer(session, customerId)) return []; return loadState().contacts.filter((item) => item.team_id === session.currentTeam.id && item.customerId === customerId).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.createdAt.localeCompare(b.createdAt)); }
export function createContact(session: SessionContext, input: CreateContactInput): { contact?: Contact; error?: string } {
  if (!getCustomer(session, input.customerId)) return { error: '客户不存在或不属于当前团队。' }; const name = input.name.trim(); if (!name) return { error: '请填写联系人姓名。' };
  const state = loadState(); const timestamp = now(); const contact: Contact = { id: createId(), team_id: session.currentTeam.id, customerId: input.customerId, name, phone: input.phone?.trim() ?? '', wechat: input.wechat?.trim() ?? '', title: input.title?.trim() ?? '', isPrimary: Boolean(input.isPrimary), createdAt: timestamp, updatedAt: timestamp };
  state.contacts.push(contact); saveState(state); return { contact };
}
export function listOpportunities(session: SessionContext, customerId?: string): Opportunity[] { ensureCustomerFoundation(session); return loadState().opportunities.filter((item) => item.team_id === session.currentTeam.id && (!customerId || item.customerId === customerId) && !item.archivedAt).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.createdAt.localeCompare(a.createdAt)); }
export function getOpportunity(session: SessionContext, opportunityId: string): Opportunity | undefined { return listOpportunities(session).find((item) => item.id === opportunityId); }
export function getDefaultOpportunity(session: SessionContext, customerId: string): Opportunity | undefined { return listOpportunities(session, customerId).find((item) => item.isDefault); }
export function createOpportunity(session: SessionContext, input: CreateOpportunityInput): { opportunity?: Opportunity; error?: string } {
  if (!getCustomer(session, input.customerId)) return { error: '客户不存在或不属于当前团队。' }; const name = input.name.trim(); if (!name) return { error: '请填写项目名称。' };
  const state = loadState(); const timestamp = now(); const opportunity: Opportunity = { id: createId(), team_id: session.currentTeam.id, customerId: input.customerId, name, stage: input.stage ?? '线索', ownerUserId: session.user.id, collaboratorUserIds: [], isDefault: false, createdAt: timestamp, updatedAt: timestamp };
  state.opportunities.push(opportunity); saveState(state); return { opportunity };
}
export function resetOpportunityState(): void { localStorage.removeItem(STORAGE_KEY); }
