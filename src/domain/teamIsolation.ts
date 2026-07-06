import type { SessionContext, TeamScopedEntity } from './models.js';

export function currentTeamId(session: SessionContext): string {
  return session.currentTeam.id;
}

export function assertTeamScope<T extends TeamScopedEntity>(session: SessionContext, entity: T): T {
  if (entity.team_id !== currentTeamId(session)) {
    throw new Error('Team isolation violation: entity does not belong to current workspace');
  }

  return entity;
}

export function scopeByCurrentTeam<T extends TeamScopedEntity>(session: SessionContext, rows: T[]): T[] {
  return rows.filter((row) => row.team_id === currentTeamId(session));
}

export function withSessionTeam<T extends object>(session: SessionContext, payload: T): T & TeamScopedEntity {
  return {
    ...payload,
    team_id: currentTeamId(session),
  };
}

export function rejectClientProvidedTeamId(payload: Record<string, unknown>): void {
  if ('team_id' in payload || 'teamId' in payload) {
    throw new Error('Do not accept client-provided team_id; derive it from the authenticated session');
  }
}

export const FOUNDATION_GUARDRAILS = [
  'All future business rows must carry team_id.',
  'APIs derive team_id from session, never from raw client input.',
  'AI suggestions cannot directly write formal data.',
  'Confirmed quotations, orders, and payments require explicit versioned changes.',
  'Uploaded files must create business-bound file_asset records or temporary cleanable records.',
] as const;
