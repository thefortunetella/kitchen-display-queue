'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'order_items',
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
          order_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'orders', key: 'id' },
            onDelete: 'CASCADE',
          },
          menu_item_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'menu_items', key: 'id' },
            onDelete: 'RESTRICT', // ordered menu items cannot be deleted
          },
          quantity: { type: Sequelize.INTEGER, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE order_items
           ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);`,
        { transaction },
      );

      await queryInterface.addIndex('order_items', ['order_id'], { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
  },
};
