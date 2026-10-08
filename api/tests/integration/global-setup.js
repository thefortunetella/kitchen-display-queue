// Creates and migrates the test database before the integration tests.
const path = require('path');
const { execSync } = require('child_process');
const { Sequelize } = require('sequelize');
const { databaseConfig } = require('../../src/config');

module.exports = async function globalSetup() {
  const testDb = databaseConfig('test');

  // CREATE DATABASE must run while connected to another database.
  const admin = new Sequelize({ ...testDb, database: databaseConfig('development').database });
  try {
    const [rows] = await admin.query('SELECT 1 FROM pg_database WHERE datname = :name', {
      replacements: { name: testDb.database },
    });
    if (rows.length === 0) await admin.query(`CREATE DATABASE "${testDb.database}"`);
  } catch (error) {
    throw new Error(`Integration tests need Postgres: run "docker compose up -d" first. (${error.message})`);
  } finally {
    await admin.close();
  }

  execSync('npx sequelize-cli db:migrate', {
    cwd: path.resolve(__dirname, '..', '..'),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'pipe',
  });
};
