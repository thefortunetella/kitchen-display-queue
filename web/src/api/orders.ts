// API client. Types mirror the JSON returned by the API.

export type OrderType = 'dine_in' | 'takeout' | 'delivery'
export type OrderStatus = 'received' | 'preparing' | 'ready' | 'picked_up' | 'cancelled'
export type OrderAction = 'start' | 'ready' | 'pickup' | 'cancel'

/** `active` is the default queue (received + preparing); the others map to `?status=`. */
export type QueueFilter = 'active' | 'received' | 'preparing'

export interface OrderItem {
  menu_item_id: number
  name: string
  prep_time_minutes: number
  quantity: number
}

/** Points per part of the priority score. */
export interface ScoreBreakdown {
  type: number
  vip: number
  wait: number
  promise: number
  complexity: number
}

/** Rule that placed an order above the next one. Open-ended: the server may add tie-breaks. */
type RankCriterion = 'score' | 'promised_at' | 'placed_at' | 'id' | (string & {})

export interface Order {
  id: number
  customer_name: string
  type: OrderType
  is_vip: boolean
  status: OrderStatus
  placed_at: string
  promised_at: string | null
  status_changed_at: string
  items: OrderItem[]
  score: number
  score_breakdown: ScoreBreakdown
  /** Queue only; null for the last order. */
  ahead_of_next?: { order_id: number; decided_by: RankCriterion } | null
  wait_minutes: number
  /** Negative once late; null without a promise. */
  minutes_until_promised: number | null
  minutes_in_status: number
  allowed_actions: OrderAction[]
}

export interface OrdersResponse {
  generated_at: string
  orders: Order[]
}

/** API error (with its stable `code`) or network failure. */
export class ApiError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(code: string, message: string, httpStatus: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('UNEXPECTED_ERROR', String(error), 0)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the API. Is it running?', 0)
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = body?.error
    // No error body: the response did not come from the API (e.g. the dev proxy).
    throw new ApiError(
      error?.code ?? 'UNEXPECTED_RESPONSE',
      error?.message ?? `No valid answer from the API (HTTP ${response.status}). Is it running on port 4000?`,
      response.status,
    )
  }
  return body as T
}

export function fetchOrders(path: string): Promise<OrdersResponse> {
  return request<OrdersResponse>(path)
}

export function queuePath(filter: QueueFilter): string {
  return filter === 'active' ? '/orders/queue' : `/orders/queue?status=${filter}`
}

export const READY_PATH = '/orders/ready'

export const FINISHED_PATH = '/orders/finished'

export function transitionOrder(id: number, action: OrderAction): Promise<{ order: Order }> {
  return request<{ order: Order }>(`/orders/${id}/${action}`, { method: 'POST' })
}
