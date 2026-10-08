'use strict';

// Sequelize.DATE maps to timestamp with time zone: instants are stored and compared in UTC.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'orders',
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
          customer_name: { type: Sequelize.STRING, allowNull: false },
          type: { type: Sequelize.STRING, allowNull: false },
          placed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          promised_at: { type: Sequelize.DATE, allowNull: true },
          is_vip: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'received' },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE orders
           ADD CONSTRAINT orders_customer_name_not_blank CHECK (btrim(customer_name) <> ''),
           ADD CONSTRAINT orders_type_valid CHECK (type IN ('dine_in', 'takeout', 'delivery')),
           ADD CONSTRAINT orders_status_valid
             CHECK (status IN ('received', 'preparing', 'ready', 'picked_up', 'cancelled'));`,
        { transaction },
      );

      // The queue filters by status.
      await queryInterface.addIndex('orders', ['status'], { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  },
};
