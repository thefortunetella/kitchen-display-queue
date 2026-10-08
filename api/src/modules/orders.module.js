// Order use cases: apply the queue and transition rules to data from the repository.
const { AppError } = require('../errors');
const repository = require('../repositories/orders.repository');
const { resolveQueueStatuses, rankQueue, withComputedFields } = require('./queue');
const { resolveTransition } = require('./transitions');
const { parseNewOrder, invalidOrder } = require('./new-order');

const READY_STATUSES = ['ready'];
const FINISHED_STATUSES = ['picked_up', 'cancelled'];
const FINISHED_LIMIT = 20;

async function getQueue({ status, now }) {
  const statuses = resolveQueueStatuses(status);
  const orders = await repository.findOrdersByStatuses(statuses);
  return rankQueue(orders, now);
}

// Longest waiting for pickup first.
async function getReadyOrders({ now }) {
  const orders = await repository.findOrdersByStatuses(READY_STATUSES, { byStatusChange: 'ASC' });
  return orders.map((order) => withComputedFields(order, now));
}

// Most recent first, capped: recent history, not an archive.
async function getFinishedOrders({ now }) {
  const orders = await repository.findOrdersByStatuses(FINISHED_STATUSES, {
    byStatusChange: 'DESC',
    limit: FINISHED_LIMIT,
  });
  return orders.map((order) => withComputedFields(order, now));
}

async function createOrder({ input, now }) {
  const order = parseNewOrder(input);

  const existing = new Set(await repository.findExistingMenuItemIds(order.items.map((item) => item.menu_item_id)));
  const unknown = order.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !existing.has(item.menu_item_id));
  if (unknown.length > 0) {
    throw invalidOrder(
      unknown.map(({ item, index }) => ({
        field: `items[${index}].menu_item_id`,
        message: `menu item ${item.menu_item_id} does not exist`,
      })),
    );
  }

  const id = await repository.createOrder({ ...order, status: 'received', placed_at: now, status_changed_at: now });
  return withComputedFields(await repository.findOrderById(id), now);
}

const orderNotFound = (id) => new AppError('ORDER_NOT_FOUND', `Order ${id} does not exist.`, { id });

async function transitionOrder({ id, action, now }) {
  const order = await repository.findOrderById(id);
  if (!order) throw orderNotFound(id);

  const nextStatus = resolveTransition(order.status, action);

  const moved = await repository.updateStatusIfCurrent(id, order.status, nextStatus, now);
  if (!moved) {
    // Another request changed the status between the read and the write.
    const current = await repository.findOrderById(id);
    if (!current) throw orderNotFound(id);
    throw new AppError(
      'INVALID_TRANSITION',
      `Order ${id} was changed to ${current.status} by another request.`,
      { action, current_status: current.status },
    );
  }

  return withComputedFields({ ...order, status: nextStatus, status_changed_at: now }, now);
}

module.exports = { FINISHED_LIMIT, getQueue, getReadyOrders, getFinishedOrders, createOrder, transitionOrder };
