const { DataTypes } = require('sequelize');

// snake_case attributes: the same names as the table columns and the API fields.
module.exports = (sequelize) =>
  sequelize.define(
    'Order',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      customer_name: { type: DataTypes.STRING, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false },
      placed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      promised_at: { type: DataTypes.DATE, allowNull: true },
      is_vip: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'received' },
      status_changed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'orders', timestamps: false },
  );
