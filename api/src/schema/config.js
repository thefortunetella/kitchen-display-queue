// sequelize-cli configuration, one block per NODE_ENV.
const { databaseConfig } = require('../config');

module.exports = {
  development: databaseConfig('development'),
  test: databaseConfig('test'),
};
