// HTTP layer. Express 5 forwards rejected promises to the error handler.
const express = require('express');
const { AppError } = require('../errors');
const ordersModule = require('../modules/orders.module');

const MAX_DB_INTEGER = 2147483647; // Postgres INTEGER max

// Positive integers only: "12abc", "1.5", "-3" and "007" are rejected, not coerced.
function parseOrderId(rawId) {
  const id = Number(rawId);
  if (!/^[1-9]\d*$/.test(rawId) || id > MAX_DB_INTEGER) {
    throw new AppError('INVALID_ORDER_ID', 'Order id must be a positive integer.', { id: rawId });
  }
  return id;
}

// `clock` is injectable so tests can freeze time.
function createOrdersRouter({ clock }) {
  const router = express.Router();

  router.get('/queue', async (req, res) => {
    const now = clock();
    const orders = await ordersModule.getQueue({ status: req.query.status, now });
    res.json({ generated_at: now.toISOString(), orders });
  });

  router.get('/ready', async (req, res) => {
    const now = clock();
    const orders = await ordersModule.getReadyOrders({ now });
    res.json({ generated_at: now.toISOString(), orders });
  });

  router.get('/finished', async (req, res) => {
    const now = clock();
    const orders = await ordersModule.getFinishedOrders({ now });
    res.json({ generated_at: now.toISOString(), orders });
  });

  router.post('/', async (req, res) => {
    const order = await ordersModule.createOrder({ input: req.body, now: clock() });
    res.status(201).json({ order });
  });

  const transition = (action) => async (req, res) => {
    const order = await ordersModule.transitionOrder({
      id: parseOrderId(req.params.id),
      action,
      now: clock(),
    });
    res.json({ order });
  };

  router.post('/:id/start', transition('start'));
  router.post('/:id/ready', transition('ready'));
  router.post('/:id/pickup', transition('pickup'));
  router.post('/:id/cancel', transition('cancel'));

  return router;
}

module.exports = { createOrdersRouter };
