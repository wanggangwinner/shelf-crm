import './customerModule.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTeamScope,
  rejectClientProvidedTeamId,
  scopeByCurrentTeam,
  withSessionTeam,
} from '../dist/domain/teamIsolation.js';

const session = { currentTeam: { id: 'team_a' } };

test('filters rows to the session team', () => {
  assert.deepEqual(
    scopeByCurrentTeam(session, [
      { team_id: 'team_a', name: 'ok' },
      { team_id: 'team_b', name: 'no' },
    ]),
    [{ team_id: 'team_a', name: 'ok' }],
  );
});

test('rejects cross-team entities', () => {
  assert.throws(() => assertTeamScope(session, { team_id: 'team_b' }), /Team isolation/);
});

test('derives team_id from the session for future API writes', () => {
  assert.deepEqual(withSessionTeam(session, { name: 'draft customer' }), {
    team_id: 'team_a',
    name: 'draft customer',
  });
});

test('rejects frontend supplied team identifiers', () => {
  assert.throws(() => rejectClientProvidedTeamId({ team_id: 'team_b' }), /client-provided team_id/);
  assert.throws(() => rejectClientProvidedTeamId({ teamId: 'team_b' }), /client-provided team_id/);
});
