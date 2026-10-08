// Defaults match docker-compose.yml; each value can be overridden by an environment variable.

// Tests read their own variable: integration tests truncate tables, so DB_NAME must never apply.
function databaseName(env) {
  if (env === 'test') return process.env.DB_NAME_TEST || 'kitchen_queue_test';
  return process.env.DB_NAME || 'kitchen_queue';
}

function databaseConfig(env = process.env.NODE_ENV || 'development') {
  return {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5433,
    username: process.env.DB_USER || 'kitchen_queue',
    password: process.env.DB_PASSWORD || 'kitchen_queue',
    database: databaseName(env),
    logging: false,
  };
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  databaseConfig,
};
