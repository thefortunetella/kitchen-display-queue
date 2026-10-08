// Priority score. Pure: `now` is passed in, nothing reads the clock or the database.

const MS_PER_MINUTE = 60 * 1000;

// All ranking weights in one place.
const PRIORITY_RULES = {
  typePoints: { dine_in: 30, takeout: 20, delivery: 10 },
  vipPoints: 20,
  wait: { stepMinutes: 10, pointsPerStep: 5, max: 40 },
  // First bucket that covers the minutes left wins; none matching (or no promise) scores 0.
  promised: [
    { upToMinutes: 30, points: 25 },
    { upToMinutes: 60, points: 15 },
  ],
  complexity: { stepMinutes: 15, pointsPerStep: 5, max: 20 },
};

// Floored whole minutes (9m50s -> 9); negative when `to` is earlier than `from`.
function wholeMinutesBetween(from, to) {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_MINUTE);
}

// Clamped at 0 so a placed_at slightly in the future (clock skew) is not penalized.
function minutesWaiting(placedAt, now) {
  return Math.max(0, wholeMinutesBetween(placedAt, now));
}

function totalPrepMinutes(items) {
  return items.reduce((sum, item) => sum + item.prep_time_minutes * item.quantity, 0);
}

// min(max, floor(value / step) * pointsPerStep), used by wait time and complexity.
function steppedPoints(value, { stepMinutes, pointsPerStep, max }) {
  return Math.min(max, Math.floor(value / stepMinutes) * pointsPerStep);
}

// Negative once overdue; null when there is no promise.
function minutesUntilPromised(promisedAt, now) {
  return promisedAt == null ? null : wholeMinutesBetween(now, promisedAt);
}

// Whole minutes keep the 0-30 / 31-60 buckets gapless (30m59s -> 30). An overdue promise is
// negative and falls in the first bucket: only "more than 60 minutes away or null" scores 0.
function promisedPoints(promisedAt, now, buckets) {
  const minutesLeft = minutesUntilPromised(promisedAt, now);
  if (minutesLeft === null) return 0;
  const bucket = buckets.find((b) => minutesLeft <= b.upToMinutes);
  return bucket ? bucket.points : 0;
}

// An order type without a weight is a configuration bug, not a silent 0.
function typePoints(type, pointsByType) {
  const points = pointsByType[type];
  if (points === undefined) throw new Error(`No priority weight for order type "${type}"`);
  return points;
}

/**
 * Points contributed by each input of the formula.
 * @returns {{ type: number, vip: number, wait: number, promise: number, complexity: number }}
 */
function scoreBreakdown(order, now, rules = PRIORITY_RULES) {
  return {
    type: typePoints(order.type, rules.typePoints),
    vip: order.is_vip ? rules.vipPoints : 0,
    wait: steppedPoints(minutesWaiting(order.placed_at, now), rules.wait),
    promise: promisedPoints(order.promised_at, now, rules.promised),
    complexity: steppedPoints(totalPrepMinutes(order.items), rules.complexity),
  };
}

/**
 * @param {object} order { type, is_vip, placed_at, promised_at, items: [{ prep_time_minutes, quantity }] }
 * @param {Date} now
 * @param {object} [rules] defaults to PRIORITY_RULES
 * @returns {number}
 */
function computeScore(order, now, rules = PRIORITY_RULES) {
  const points = scoreBreakdown(order, now, rules);
  return points.type + points.vip + points.wait + points.promise + points.complexity;
}

module.exports = { PRIORITY_RULES, computeScore, scoreBreakdown, minutesWaiting, minutesUntilPromised };
