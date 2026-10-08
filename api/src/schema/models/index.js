// Connection, models and associations.
const { Sequelize } = require('sequelize');
const { databaseConfig } = require('../../config');

const sequelize = new Sequelize(databaseConfig());

const MenuItem = require('./menu-item')(sequelize);
const Order = require('./order')(sequelize);
const OrderItem = require('./order-item')(sequelize);

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(MenuItem, { as: 'menu_item', foreignKey: 'menu_item_id' });

module.exports = { sequelize, MenuItem, Order, OrderItem };
