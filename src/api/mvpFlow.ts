import type { SessionContext } from '../domain/models.js';

export function getMvpDashboard(_session: SessionContext) {
  return {
    pendingTasks: 0,
    quotations: 0,
    confirmedQuotations: 0,
    orders: 0,
    receivableAmount: 0,
    receivedAmount: 0,
  };
}
