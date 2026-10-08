'use strict';

// Time of the last status change, used to order the ready and finished lists.
// Existing rows are backfilled with placed_at.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'orders',
        'status_changed_at',
        { type: Sequelize.DATE, allowNull: true },
        { transaction },
      );
      await queryInterface.sequelize.query('UPDATE orders SET status_changed_at = placed_at;', { transaction });
      await queryInterface.changeColumn(
        'orders',
        'status_changed_at',
        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('orders', 'status_changed_at');
  },
};
