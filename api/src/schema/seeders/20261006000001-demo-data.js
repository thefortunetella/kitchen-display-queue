'use strict';

// Demo data. Timestamps are relative to the moment the seed runs; re-run `npm run db:setup`
// to refresh them.

const MENU_ITEMS = [
  { name: 'Caesar Salad', category: 'starter', prep_time_minutes: 10 },
  { name: 'Bruschetta', category: 'starter', prep_time_minutes: 8 },
  { name: 'Grilled Salmon', category: 'main_course', prep_time_minutes: 20 },
  { name: 'Margherita Pizza', category: 'main_course', prep_time_minutes: 12 },
  { name: 'Ribeye Steak', category: 'main_course', prep_time_minutes: 25 },
  { name: 'Mushroom Risotto', category: 'main_course', prep_time_minutes: 18 },
  { name: 'Tiramisu', category: 'dessert', prep_time_minutes: 6 },
  { name: 'Chocolate Lava Cake', category: 'dessert', prep_time_minutes: 15 },
  { name: 'Lemonade', category: 'drink', prep_time_minutes: 2 },
  { name: 'Espresso', category: 'drink', prep_time_minutes: 1 },
];

// Each order in preparation was the highest-ranked waiting order when it was started.
// Active queue right after seeding: Grace 95, Ben 90, Alice 75, Felix 60, Emma 60, Chloe 25, David 25.
//
// Required cases and the rows that cover them:
//   every order type ............ dine_in, takeout and delivery all appear below
//   VIP and non-VIP ............. Grace Hill / Felix Carter / Iris Bennett are VIP, the rest are not
//   wait-time cap ............... Ben Turner and Alice Morgan (waiting 80+ minutes)
//   complexity cap .............. Ben Turner (70 prep minutes)
//   tie broken by promised_at ... Felix Carter vs Emma Brooks, Chloe Davis vs David Reed
//   received, preparing, ready .. statuses below; Henry Ward and Kate Moore are `ready`
//                                 (not in the active queue)
// Names are fictional.
//
// `placed` = minutes ago, `promised` = minutes from now (negative = in the past), null = no promise,
// `changed` = minutes since the last status change (defaults to `placed`: never moved).
const ORDERS = [
  // VIP takeout due in 10 min, preparing for 25. 20 + 20 + 20 + 25 + 10 = 95
  { customer_name: 'Grace Hill', type: 'takeout', is_vip: true, status: 'preparing', placed: 40, changed: 25, promised: 10,
    items: [['Grilled Salmon', 1], ['Caesar Salad', 1]] },

  // Wait-time and complexity caps: 70 prep minutes, placed 90 min ago. 30 + 40 + 0 + 20 = 90
  { customer_name: 'Ben Turner', type: 'dine_in', is_vip: false, status: 'preparing', placed: 90, changed: 30, promised: null,
    items: [['Ribeye Steak', 2], ['Grilled Salmon', 1]] },

  // Wait-time cap: waiting 85 min, not started. 30 + 40 + 0 + 5 = 75
  { customer_name: 'Alice Morgan', type: 'dine_in', is_vip: false, status: 'received', placed: 85, promised: null,
    items: [['Mushroom Risotto', 1]] },

  // As in spec Example B. 10 + 20 + 5 + 25 + 0 = 60
  { customer_name: 'Felix Carter', type: 'delivery', is_vip: true, status: 'received', placed: 10, promised: 20,
    items: [['Margherita Pizza', 1]] },
  // As in spec Example A; ties with Felix, who ranks first (he has a promised_at). 30 + 15 + 0 + 15 = 60
  // Placed 30 min ago instead of 35 so both orders cross wait-time steps together and stay tied.
  { customer_name: 'Emma Brooks', type: 'dine_in', is_vip: false, status: 'received', placed: 30, promised: null,
    items: [['Grilled Salmon', 2], ['Caesar Salad', 1], ['Espresso', 1]] },

  // Same score (20 + 5 = 25), different promised_at: Chloe ranks above David. Both promises are
  // over 60 min away, so the tie holds for about two hours.
  { customer_name: 'Chloe Davis', type: 'takeout', is_vip: false, status: 'received', placed: 15, promised: 180,
    items: [['Margherita Pizza', 1], ['Lemonade', 1]] },
  { customer_name: 'David Reed', type: 'takeout', is_vip: false, status: 'received', placed: 15, promised: 240,
    items: [['Margherita Pizza', 1], ['Lemonade', 1]] },

  // Ready for pickup; Kate's promised time has passed.
  { customer_name: 'Henry Ward', type: 'takeout', is_vip: false, status: 'ready', placed: 40, changed: 4, promised: 5,
    items: [['Bruschetta', 2]] },
  { customer_name: 'Kate Moore', type: 'delivery', is_vip: false, status: 'ready', placed: 45, changed: 9, promised: -2,
    items: [['Mushroom Risotto', 1], ['Lemonade', 2]] },
  // Finished.
  { customer_name: 'Iris Bennett', type: 'delivery', is_vip: true, status: 'picked_up', placed: 120, changed: 55, promised: -60,
    items: [['Chocolate Lava Cake', 1]] },
  { customer_name: 'Liam Price', type: 'dine_in', is_vip: false, status: 'picked_up', placed: 70, changed: 10, promised: null,
    items: [['Grilled Salmon', 1], ['Espresso', 2]] },
  { customer_name: 'Jack Foster', type: 'dine_in', is_vip: false, status: 'cancelled', placed: 25, changed: 18, promised: null,
    items: [['Ribeye Steak', 1]] },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = Date.now();
    const minutesFromNow = (minutes) => new Date(now + minutes * 60 * 1000);

    await queryInterface.sequelize.transaction(async (transaction) => {
      const menuRows = await queryInterface.bulkInsert('menu_items', MENU_ITEMS, {
        transaction,
        returning: ['id', 'name'],
      });
      const menuIdByName = Object.fromEntries(menuRows.map((row) => [row.name, row.id]));

      // RETURNING keeps insert order: orderRows[i] is ORDERS[i].
      const orderRows = await queryInterface.bulkInsert(
        'orders',
        ORDERS.map((order) => ({
          customer_name: order.customer_name,
          type: order.type,
          is_vip: order.is_vip,
          status: order.status,
          placed_at: minutesFromNow(-order.placed),
          promised_at: order.promised === null ? null : minutesFromNow(order.promised),
          status_changed_at: minutesFromNow(-(order.changed ?? order.placed)),
        })),
        { transaction, returning: ['id'] },
      );

      const orderItemRows = ORDERS.flatMap((order, index) =>
        order.items.map(([menuItemName, quantity]) => ({
          order_id: orderRows[index].id,
          menu_item_id: menuIdByName[menuItemName],
          quantity,
        })),
      );
      await queryInterface.bulkInsert('order_items', orderItemRows, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('order_items', null, {});
    await queryInterface.bulkDelete('orders', null, {});
    await queryInterface.bulkDelete('menu_items', null, {});
  },
};
