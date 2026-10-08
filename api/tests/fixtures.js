// Frozen clock shared by all tests (the spec's worked-example time).
const NOW = new Date('2026-06-15T12:00:00Z');

const MS_PER_MINUTE = 60 * 1000;
const minutesAgo = (minutes) => new Date(NOW.getTime() - minutes * MS_PER_MINUTE);
const minutesFromNow = (minutes) => new Date(NOW.getTime() + minutes * MS_PER_MINUTE);

const MENU = {
  grilledSalmon: { name: 'Grilled Salmon', prep_time_minutes: 20 },
  caesarSalad: { name: 'Caesar Salad', prep_time_minutes: 10 },
  margheritaPizza: { name: 'Margherita Pizza', prep_time_minutes: 12 },
};
const item = (menuItem, quantity) => ({ ...menuItem, quantity });

// Worth exactly 10 points (delivery base), so a test can change one input at a time.
function buildOrder(overrides = {}) {
  return {
    id: 1,
    customer_name: 'Test',
    type: 'delivery',
    is_vip: false,
    status: 'received',
    placed_at: NOW,
    status_changed_at: NOW,
    promised_at: null,
    items: [],
    ...overrides,
  };
}

module.exports = { NOW, minutesAgo, minutesFromNow, MENU, item, buildOrder };
