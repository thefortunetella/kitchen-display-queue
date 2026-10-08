// Order data access: Sequelize queries, includes and filters.
const { sequelize, Order, OrderItem, MenuItem } = require('../schema/models');

const ITEMS = { model: OrderItem, as: 'items' };

// Order lines with their menu item, in insertion order.
const WITH_ITEMS = {
  include: [{ ...ITEMS, include: [{ model: MenuItem, as: 'menu_item' }] }],
  order: [['id', 'ASC'], [ITEMS, 'id', 'ASC']],
};

// Plain objects for the module layer, with each line's menu data flattened in.
function toPlainOrder(orderInstance) {
  const { items, ...order } = orderInstance.get({ plain: true });
  return {
    ...order,
    items: items.map((line) => ({
      menu_item_id: line.menu_item_id,
      name: line.menu_item.name,
      prep_time_minutes: line.menu_item.prep_time_minutes,
      quantity: line.quantity,
    })),
  };
}

// byStatusChange: 'ASC' | 'DESC', sorts by the last status change.
async function findOrdersByStatuses(statuses, { byStatusChange, limit } = {}) {
  const orders = await Order.findAll({
    ...WITH_ITEMS,
    where: { status: statuses },
    order: byStatusChange ? [['status_changed_at', byStatusChange], ...WITH_ITEMS.order] : WITH_ITEMS.order,
    limit,
  });
  return orders.map(toPlainOrder);
}

async function findOrderById(id) {
  const order = await Order.findByPk(id, WITH_ITEMS);
  return order ? toPlainOrder(order) : null;
}

// Conditional update; returns false if the status changed since it was read.
async function updateStatusIfCurrent(id, fromStatus, toStatus, changedAt) {
  const [affectedRows] = await Order.update(
    { status: toStatus, status_changed_at: changedAt },
    { where: { id, status: fromStatus } },
  );
  return affectedRows === 1;
}

async function findExistingMenuItemIds(ids) {
  const rows = await MenuItem.findAll({ attributes: ['id'], where: { id: ids } });
  return rows.map((row) => row.id);
}

// Order and lines in one transaction: all of it is stored or none.
async function createOrder({ items, ...fields }) {
  return sequelize.transaction(async (transaction) => {
    const order = await Order.create(fields, { transaction });
    await OrderItem.bulkCreate(
      items.map((item) => ({ ...item, order_id: order.id })),
      { transaction },
    );
    return order.id;
  });
}

module.exports = { findOrdersByStatuses, findOrderById, findExistingMenuItemIds, createOrder, updateStatusIfCurrent };
