import type { FileAsset, SessionContext } from '../domain/models.js';
import { getCustomer } from './customers.js';
import { listOrders } from './orderFlow.js';

const STORAGE_KEY = 'shelf-crm-file-assets-state-v1';
interface State { assets: FileAsset[] }
const emptyState = (): State => ({ assets: [] });
function loadState(): State { if (typeof localStorage === 'undefined') return emptyState(); const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState(); }
function saveState(state: State): void { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const createId = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export interface BindFileAssetInput { customerId: string; targetType: 'customer' | 'order'; targetId: string; fileName: string; fileType?: string; size?: number; note?: string }
export function bindFileAsset(session: SessionContext, input: BindFileAssetInput): { asset?: FileAsset; error?: string } {
  if (!getCustomer(session, input.customerId)) return { error: '客户不存在或不属于当前团队。' };
  if (input.targetType === 'customer' && input.targetId !== input.customerId) return { error: '客户文件必须绑定到当前客户。' };
  if (input.targetType === 'order' && !listOrders(session).some((order) => order.id === input.targetId && order.customerId === input.customerId)) return { error: '订单不存在或不属于当前客户。' };
  const fileName = input.fileName.trim(); if (!fileName) return { error: '请选择或填写文件名。' };
  const state = loadState(); const asset: FileAsset = { id: createId(), team_id: session.currentTeam.id, customerId: input.customerId, targetType: input.targetType, targetId: input.targetId, fileName, fileType: input.fileType?.trim() || 'application/octet-stream', size: Math.max(0, Number(input.size) || 0), note: input.note?.trim() ?? '', createdAt: new Date().toISOString() };
  state.assets.push(asset); saveState(state); return { asset };
}
export function listFileAssets(session: SessionContext, customerId: string): FileAsset[] { return loadState().assets.filter((asset) => asset.team_id === session.currentTeam.id && asset.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function resetFileAssetState(): void { localStorage.removeItem(STORAGE_KEY); }
