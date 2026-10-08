// Order status state machine. Pure.
const { AppError } = require('../errors');

// The only legal moves. Anything else is rejected: skipping a step, repeating the current
// status, or leaving a terminal status (picked_up, cancelled).
const TRANSITIONS = {
  start: { from: ['received'], to: 'preparing' },
  ready: { from: ['preparing'], to: 'ready' },
  pickup: { from: ['ready'], to: 'picked_up' },
  cancel: { from: ['received'], to: 'cancelled' },
};

function resolveTransition(currentStatus, action) {
  const rule = TRANSITIONS[action];
  if (!rule) throw new Error(`Unknown transition action "${action}"`);

  if (!rule.from.includes(currentStatus)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `Cannot ${action} an order that is ${currentStatus}.`,
      { action, current_status: currentStatus, allowed_from: rule.from },
    );
  }
  return rule.to;
}

// Returned with each order so clients render actions without duplicating these rules.
function allowedActions(status) {
  return Object.keys(TRANSITIONS).filter((action) => TRANSITIONS[action].from.includes(status));
}

module.exports = { TRANSITIONS, resolveTransition, allowedActions };
