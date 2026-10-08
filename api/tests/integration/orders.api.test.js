// HTTP through to Postgres, with a frozen clock so scores are exact.
const request = require('supertest');
const { createApp } = require('../../src/app');
const { sequelize, MenuItem, Order, OrderItem } = require('../../src/schema/models');
const { NOW, minutesAgo, minutesFromNow } = require('../fixtures');

const app = createApp({ clock: () => NOW });

let salmon; // Grilled Salmon, 20 prep minutes

beforeAll(() => {
  // These tests truncate tables: refuse any database that is not a *_test one.
  const database = sequelize.getDatabaseName();
  if (!database.endsWith('_test')) {
    throw new Error(`Refusing to run integration tests against "${database}".`);
  }
});

beforeEach(async () => {
  await sequelize.query('TRUNCATE order_items, orders, menu_items RESTART IDENTITY CASCADE');
  salmon = await MenuItem.create({ name: 'Grilled Salmon', category: 'main_course', prep_time_minutes: 20 });
});

afterAll(async () => {
  await sequelize.close();
});

async function createOrder(fields = {}, quantity = 1) {
  // Set explicitly: the column default would use the real clock.
  const order = await Order.create({
    customer_name: 'Test',
    type: 'dine_in',
    placed_at: NOW,
    status_changed_at: fields.placed_at ?? NOW,
    ...fields,
  });
  await OrderItem.create({ order_id: order.id, menu_item_id: salmon.id, quantity });
  return order;
}

const statusOf = async (id) => (await Order.findByPk(id)).status;

describe('GET /orders/queue', () => {
  test('default queue: received and preparing only, ranked, each with its computed score', async () => {
    const low = await createOrder({ type: 'delivery' }); // 10 + 5 (20 prep min) = 15
    const high = await createOrder({ type: 'dine_in', placed_at: minutesAgo(35) }); // 30 + 15 + 5 = 50
    const preparing = await createOrder({ type: 'takeout', status: 'preparing' }); // 20 + 5 = 25
    await createOrder({ status: 'ready' });
    await createOrder({ status: 'picked_up' });
    await createOrder({ status: 'cancelled' });

    const res = await request(app).get('/orders/queue').expect(200);

    expect(res.body.generated_at).toBe(NOW.toISOString());
    expect(res.body.orders.map((o) => [o.id, o.score])).toEqual([
      [high.id, 50],
      [preparing.id, 25],
      [low.id, 15],
    ]);
  });

  test('each order carries its items, wait time and the actions allowed from its status', async () => {
    const order = await createOrder({ placed_at: minutesAgo(12), promised_at: minutesFromNow(20) }, 2);

    const res = await request(app).get('/orders/queue').expect(200);

    expect(res.body.orders[0]).toMatchObject({
      id: order.id,
      customer_name: 'Test',
      type: 'dine_in',
      is_vip: false,
      status: 'received',
      placed_at: minutesAgo(12).toISOString(),
      promised_at: minutesFromNow(20).toISOString(),
      items: [{ menu_item_id: salmon.id, name: 'Grilled Salmon', prep_time_minutes: 20, quantity: 2 }],
      wait_minutes: 12,
      minutes_until_promised: 20,
      score: 30 + 5 + 25 + 10,
      allowed_actions: ['start', 'cancel'],
      score_breakdown: { type: 30, vip: 0, wait: 5, promise: 25, complexity: 10 }, // adds up to the score
      ahead_of_next: null, // the only order: nothing below it
    });
  });

  test.each(['received', 'preparing'])('?status=%s returns only that status', async (status) => {
    await createOrder({ status: 'received' });
    await createOrder({ status: 'preparing' });

    const res = await request(app).get('/orders/queue').query({ status }).expect(200);

    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].status).toBe(status);
  });

  test.each(['ready', 'cancelled', 'unknown'])('?status=%s is rejected with INVALID_STATUS_FILTER', async (status) => {
    const res = await request(app).get('/orders/queue').query({ status }).expect(400);

    expect(res.body.error.code).toBe('INVALID_STATUS_FILTER');
  });

  test('an empty queue is an empty list, not an error', async () => {
    const res = await request(app).get('/orders/queue').expect(200);

    expect(res.body.orders).toEqual([]);
  });
});

describe('POST /orders/:id/{start,ready,pickup,cancel}: legal transitions', () => {
  test('received -> preparing -> ready -> picked_up, and the order leaves the queue', async () => {
    const order = await createOrder();

    const started = await request(app).post(`/orders/${order.id}/start`).expect(200);
    expect(started.body.order).toMatchObject({ id: order.id, status: 'preparing', allowed_actions: ['ready'] });

    const ready = await request(app).post(`/orders/${order.id}/ready`).expect(200);
    expect(ready.body.order).toMatchObject({ status: 'ready', allowed_actions: ['pickup'] });

    const pickedUp = await request(app).post(`/orders/${order.id}/pickup`).expect(200);
    expect(pickedUp.body.order).toMatchObject({ status: 'picked_up', allowed_actions: [] });

    expect(await statusOf(order.id)).toBe('picked_up');
    const queue = await request(app).get('/orders/queue').expect(200);
    expect(queue.body.orders).toEqual([]);
  });

  test('received -> cancelled, and the order leaves the queue', async () => {
    const order = await createOrder();

    const res = await request(app).post(`/orders/${order.id}/cancel`).expect(200);

    expect(res.body.order.status).toBe('cancelled');
    const queue = await request(app).get('/orders/queue').expect(200);
    expect(queue.body.orders).toEqual([]);
  });
});

describe('POST /orders/:id/...: rejected transitions leave the order unchanged', () => {
  test.each([
    ['repeat: start an order that is already preparing', 'preparing', 'start'],
    ['skip: received straight to ready', 'received', 'ready'],
    ['skip: preparing straight to picked_up', 'preparing', 'pickup'],
    ['cancel after preparation started', 'preparing', 'cancel'],
    ['terminal: start a cancelled order', 'cancelled', 'start'],
    ['terminal: pick up an order already picked up', 'picked_up', 'pickup'],
  ])('%s -> 409 INVALID_TRANSITION', async (_label, status, action) => {
    const order = await createOrder({ status });

    const res = await request(app).post(`/orders/${order.id}/${action}`).expect(409);

    expect(res.body.error).toMatchObject({
      code: 'INVALID_TRANSITION',
      details: { action, current_status: status },
    });
    expect(typeof res.body.error.message).toBe('string');
    expect(await statusOf(order.id)).toBe(status);
  });

  test('two simultaneous starts: exactly one wins, the other gets INVALID_TRANSITION', async () => {
    const order = await createOrder();

    const responses = await Promise.all([
      request(app).post(`/orders/${order.id}/start`),
      request(app).post(`/orders/${order.id}/start`),
    ]);

    expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    expect(await statusOf(order.id)).toBe('preparing');
  });
});

describe('transitions record when the status changed', () => {
  test('status_changed_at is set to the request time', async () => {
    const order = await createOrder({ placed_at: minutesAgo(30) });

    const res = await request(app).post(`/orders/${order.id}/start`).expect(200);

    expect(res.body.order).toMatchObject({ status_changed_at: NOW.toISOString(), minutes_in_status: 0 });
    expect((await Order.findByPk(order.id)).status_changed_at.toISOString()).toBe(NOW.toISOString());
  });
});

describe('GET /orders/ready and /orders/finished', () => {
  test('ready: only ready orders, longest waiting for pickup first, with the pickup action', async () => {
    const recent = await createOrder({ status: 'ready', status_changed_at: minutesAgo(2) });
    const longest = await createOrder({ status: 'ready', status_changed_at: minutesAgo(12) });
    await createOrder({ status: 'preparing' });
    await createOrder({ status: 'picked_up' });

    const res = await request(app).get('/orders/ready').expect(200);

    expect(res.body.orders.map((o) => [o.id, o.minutes_in_status])).toEqual([
      [longest.id, 12],
      [recent.id, 2],
    ]);
    expect(res.body.orders[0].allowed_actions).toEqual(['pickup']);
  });

  test('finished: picked up and cancelled, most recent first, no actions', async () => {
    const older = await createOrder({ status: 'picked_up', status_changed_at: minutesAgo(40) });
    const newer = await createOrder({ status: 'cancelled', status_changed_at: minutesAgo(5) });
    await createOrder({ status: 'ready' });
    await createOrder({ status: 'received' });

    const res = await request(app).get('/orders/finished').expect(200);

    expect(res.body.orders.map((o) => o.id)).toEqual([newer.id, older.id]);
    expect(res.body.orders.every((o) => o.allowed_actions.length === 0)).toBe(true);
  });

  test('a picked-up order moves from the ready view to the finished view', async () => {
    const order = await createOrder({ status: 'ready' });

    await request(app).post(`/orders/${order.id}/pickup`).expect(200);

    expect((await request(app).get('/orders/ready')).body.orders).toEqual([]);
    expect((await request(app).get('/orders/finished')).body.orders.map((o) => o.id)).toEqual([order.id]);
  });
});

describe('POST /orders', () => {
  const body = () => ({
    customer_name: 'Nora Blake',
    type: 'delivery',
    is_vip: true,
    promised_at: minutesFromNow(20).toISOString(),
    items: [{ menu_item_id: salmon.id, quantity: 2 }],
  });

  test('creates a received order placed now, ranked into the queue', async () => {
    const res = await request(app).post('/orders').send(body()).expect(201);

    expect(res.body.order).toMatchObject({
      customer_name: 'Nora Blake',
      status: 'received',
      placed_at: NOW.toISOString(),
      items: [{ menu_item_id: salmon.id, name: 'Grilled Salmon', quantity: 2 }],
      score: 10 + 20 + 0 + 25 + 10,
      allowed_actions: ['start', 'cancel'],
    });

    const queue = await request(app).get('/orders/queue').expect(200);
    expect(queue.body.orders.map((o) => o.id)).toEqual([res.body.order.id]);
  });

  test('empty items -> 400 VALIDATION_ERROR, nothing stored', async () => {
    const res = await request(app).post('/orders').send({ ...body(), items: [] }).expect(400);

    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', details: { errors: [{ field: 'items' }] } });
    expect(await Order.count()).toBe(0);
  });

  test('a menu item that does not exist -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ ...body(), items: [{ menu_item_id: 9999, quantity: 1 }] })
      .expect(400);

    expect(res.body.error.details.errors).toEqual([{ field: 'items[0].menu_item_id', message: 'menu item 9999 does not exist' }]);
  });

  test.each([0, -1, 1.5, '2'])('quantity %p -> 400 VALIDATION_ERROR', async (quantity) => {
    const res = await request(app)
      .post('/orders')
      .send({ ...body(), items: [{ menu_item_id: salmon.id, quantity }] })
      .expect(400);

    expect(res.body.error.details.errors).toEqual([{ field: 'items[0].quantity', message: 'must be a positive integer' }]);
  });

  test('malformed JSON -> 400 BAD_REQUEST', async () => {
    const res = await request(app).post('/orders').set('Content-Type', 'application/json').send('{"customer_name":').expect(400);

    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('request errors', () => {
  test('unknown order -> 404 ORDER_NOT_FOUND', async () => {
    const res = await request(app).post('/orders/999/start').expect(404);

    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  test.each(['abc', '1.5', '-3', '0', '99999999999'])('id %p -> 400 INVALID_ORDER_ID', async (id) => {
    const res = await request(app).post(`/orders/${id}/start`).expect(400);

    expect(res.body.error.code).toBe('INVALID_ORDER_ID');
  });

  test('unknown route -> 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(app).post('/orders/1/teleport').expect(404);

    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  test('wrong method on a known path -> 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(app).get('/orders/1/start').expect(404);

    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  test('malformed URL encoding -> 400 BAD_REQUEST, not a 500', async () => {
    const res = await request(app).post('/orders/%E0%A4%A/start').expect(400);

    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  test('responses do not advertise the framework', async () => {
    const res = await request(app).get('/orders/queue').expect(200);

    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
