// Waits up to 30 s for Postgres. On first boot `docker compose up -d` returns before the
// database accepts connections, and sequelize-cli does not retry.
const { Sequelize } = require('sequelize');
const { databaseConfig } = require('../src/config');

const MAX_ATTEMPTS = 30;
const DELAY_MS = 1000;

async function waitForDatabase() {
  const sequelize = new Sequelize(databaseConfig());

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await sequelize.authenticate();
      await sequelize.close();
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        console.error(`Postgres is not reachable (${error.message}). Did you run "docker compose up -d"?`);
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }
}

waitForDatabase();
