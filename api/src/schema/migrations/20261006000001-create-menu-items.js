'use strict';

// Data rules are also enforced by the database. CHECK constraints instead of ENUM types: a CHECK
// is one statement to change in a later migration. Postgres DDL is transactional, so each
// migration applies fully or not at all.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'menu_items',
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
          name: { type: Sequelize.STRING, allowNull: false, unique: true },
          category: { type: Sequelize.STRING, allowNull: false },
          prep_time_minutes: { type: Sequelize.INTEGER, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE menu_items
           ADD CONSTRAINT menu_items_name_not_blank CHECK (btrim(name) <> ''),
           ADD CONSTRAINT menu_items_category_valid
             CHECK (category IN ('starter', 'main_course', 'dessert', 'drink')),
           ADD CONSTRAINT menu_items_prep_time_positive CHECK (prep_time_minutes > 0);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('menu_items');
  },
};
