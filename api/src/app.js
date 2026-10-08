// Builds the app without listening, so tests can use supertest.
const express = require('express');
const { createOrdersRouter } = require('./endpoints/orders.endpoint');
const { notFoundHandler, errorHandler } = require('./endpoints/error-handler');

function createApp({ clock = () => new Date() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/orders', createOrdersRouter({ clock }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
