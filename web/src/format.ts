// Labels and text formatting for the UI.
import type { OrderAction, OrderItem, OrderStatus, OrderType, QueueFilter } from './api/orders'

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: 'Dine-in',
  takeout: 'Takeout',
  delivery: 'Delivery',
}

const ORDER_TYPE_HINT: Record<OrderType, string> = {
  dine_in: 'eats in the restaurant',
  takeout: 'customer picks up',
  delivery: 'goes out with a courier',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
}

const STATUS_TONE: Record<OrderStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  received: 'info',
  preparing: 'warning',
  ready: 'success',
  picked_up: 'neutral',
  cancelled: 'neutral',
}

// Lookups fall back to a readable version of the raw value, so values added on the server
// (a new status, type or action) render instead of breaking the page.

/** "on_hold" -> "On hold" */
export function humanize(value: string): string {
  const words = value.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export const statusLabel = (status: string): string =>
  (STATUS_LABEL as Record<string, string>)[status] ?? humanize(status)

export const statusTone = (status: string): (typeof STATUS_TONE)[OrderStatus] =>
  (STATUS_TONE as Record<string, (typeof STATUS_TONE)[OrderStatus]>)[status] ?? 'neutral'

export const typeLabel = (type: string): string =>
  (ORDER_TYPE_LABEL as Record<string, string>)[type] ?? humanize(type)

export const typeHint = (type: string): string => (ORDER_TYPE_HINT as Record<string, string>)[type] ?? ''

/** "active", "received" and "preparing" are queue filters; "ready" and "finished" are other lists. */
export type View = QueueFilter | 'ready' | 'finished'

export const VIEW_LABEL: Record<View, string> = {
  active: 'All active',
  received: STATUS_LABEL.received,
  preparing: STATUS_LABEL.preparing,
  ready: STATUS_LABEL.ready,
  finished: 'Finished',
}

export const VIEW_HINT: Record<View, string> = {
  active: 'received + preparing',
  received: 'not started yet',
  preparing: 'in the kitchen',
  ready: 'waiting for pickup',
  finished: 'picked up or cancelled',
}

export const ACTION_LABEL: Record<OrderAction, string> = {
  start: 'Start preparing',
  ready: 'Mark ready',
  pickup: 'Mark picked up',
  cancel: 'Cancel order',
}

export const actionLabel = (action: string): string =>
  (ACTION_LABEL as Record<string, string>)[action] ?? humanize(action)

export function describeNewStatus(orderId: number, status: string): string {
  switch (status) {
    case 'preparing':
      return `Order #${orderId} is now Preparing.`
    case 'ready':
      return `Order #${orderId} is now Ready. Find it under “Ready”.`
    case 'picked_up':
      return `Order #${orderId} was Picked up. Find it under “Finished”.`
    case 'cancelled':
      return `Order #${orderId} was Cancelled. Find it under “Finished”.`
    default:
      return `Order #${orderId} is now ${statusLabel(status)}.`
  }
}

export const EMPTY_MESSAGE: Record<View, string> = {
  active: 'No active orders. The kitchen is clear.',
  received: 'No Received orders: nothing waiting to be started.',
  preparing: 'No orders are Preparing right now.',
  ready: 'No Ready orders: nothing waiting for pickup.',
  finished: 'No Finished orders yet.',
}

/** "2× Grilled Salmon, 1× Caesar Salad" (non-breaking space after the quantity). */
export function formatItems(items: OrderItem[]): string {
  return items.map((item) => `${item.quantity}× ${item.name}`).join(', ')
}

// English, 24-hour format regardless of the browser language; local time zone.
const LOCALE = 'en-GB'

/** Local wall-clock time, e.g. "14:35" (or "14:35:08" with seconds). */
export function formatTime(isoTimestamp: string, withSeconds = false): string {
  return new Date(isoTimestamp).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds && { second: '2-digit' }),
  })
}

/** Local date for the header, e.g. "Tue, 7 Oct". */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "just now", "12 s ago", "3 min ago" */
export function formatAgo(from: Date, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - from.getTime()) / 1000))
  if (seconds < 3) return 'just now'
  if (seconds < 60) return `${seconds} s ago`
  return `${Math.floor(seconds / 60)} min ago`
}

/** "45 min", "2 h", "2 h 59 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** "in 20 min", "due now", "5 min late" */
export function formatMinutesUntil(minutes: number): string {
  if (minutes > 0) return `in ${formatDuration(minutes)}`
  if (minutes === 0) return 'due now'
  return `${formatDuration(-minutes)} late`
}
