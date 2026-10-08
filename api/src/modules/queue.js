// Active queue: which statuses it contains and how it is ordered. Pure.
const { AppError } = require('../errors');
const { computeScore, scoreBreakdown, minutesWaiting, minutesUntilPromised } = require('./priority');
const { allowedActions } = require('./transitions');

const ACTIVE_STATUSES = ['received', 'preparing'];

function resolveQueueStatuses(statusFilter) {
  if (statusFilter === undefined) return [...ACTIVE_STATUSES];
  if (ACTIVE_STATUSES.includes(statusFilter)) return [statusFilter];
  throw new AppError(
    'INVALID_STATUS_FILTER',
    `status must be one of: ${ACTIVE_STATUSES.join(', ')}.`,
    { status: statusFilter, allowed: ACTIVE_STATUSES },
  );
}

// Earlier first; null last.
function compareTimesNullLast(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}

// Score first, then the tie-breaks, in order. Used by both compareQueue and decidedBy.
const QUEUE_ORDER = [
  { name: 'score', compare: (a, b) => b.score - a.score },
  { name: 'promised_at', compare: (a, b) => compareTimesNullLast(a.promised_at, b.promised_at) },
  { name: 'placed_at', compare: (a, b) => compareTimesNullLast(a.placed_at, b.placed_at) },
  { name: 'id', compare: (a, b) => a.id - b.id },
];

function compareQueue(a, b) {
  for (const criterion of QUEUE_ORDER) {
    const result = criterion.compare(a, b);
    if (result !== 0) return result;
  }
  return 0;
}

// Name of the first criterion that separates `a` from `b`.
function decidedBy(a, b) {
  return QUEUE_ORDER.find((criterion) => criterion.compare(a, b) !== 0)?.name ?? null;
}

// Values derived from `now`. Computed per request, never stored.
function withComputedFields(order, now) {
  return {
    ...order,
    score: computeScore(order, now),
    score_breakdown: scoreBreakdown(order, now),
    wait_minutes: minutesWaiting(order.placed_at, now),
    minutes_until_promised: minutesUntilPromised(order.promised_at, now),
    minutes_in_status: minutesWaiting(order.status_changed_at, now),
    allowed_actions: allowedActions(order.status),
  };
}

function rankQueue(orders, now) {
  const ranked = orders.map((order) => withComputedFields(order, now)).sort(compareQueue);
  return ranked.map((order, index) => {
    const next = ranked[index + 1];
    return { ...order, ahead_of_next: next ? { order_id: next.id, decided_by: decidedBy(order, next) } : null };
  });
}

module.exports = { resolveQueueStatuses, withComputedFields, rankQueue };
