import type { Order } from '../api/orders'

export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    customer_name: 'Alice Martin',
    type: 'dine_in',
    is_vip: false,
    status: 'received',
    placed_at: '2026-06-15T11:30:00Z',
    promised_at: null,
    status_changed_at: '2026-06-15T11:30:00Z',
    items: [{ menu_item_id: 1, name: 'Grilled Salmon', prep_time_minutes: 20, quantity: 2 }],
    score: 60,
    score_breakdown: { type: 30, vip: 0, wait: 15, promise: 0, complexity: 15 },
    ahead_of_next: null,
    wait_minutes: 30,
    minutes_until_promised: null,
    minutes_in_status: 30,
    allowed_actions: ['start', 'cancel'],
    ...overrides,
  }
}
