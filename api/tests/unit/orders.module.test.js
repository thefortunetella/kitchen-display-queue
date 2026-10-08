// Module logic with a mocked repository, so the race-condition branch can be forced.
jest.mock('../../src/repositories/orders.repository');

const repository = require('../../src/repositories/orders.repository');
const {
  FINISHED_LIMIT,
  getQueue,
  getReadyOrders,
  getFinishedOrders,
  createOrder,
  transitionOrder,
} = require('../../src/modules/orders.module');
const { NOW, minutesAgo, buildOrder } = require('../fixtures');

afterEach(() => jest.resetAllMocks());

describe('getQueue', () => {
  test('asks the repository for the active statuses only and ranks the result', async () => {
    repository.findOrdersByStatuses.mockResolvedValue([
      buildOrder({ id: 1, type: 'delivery' }),
      buildOrder({ id: 2, type: 'dine_in', placed_at: minutesAgo(20) }),
    ]);

    const queue = await getQueue({ status: undefined, now: NOW });

    expect(repository.findOrdersByStatuses).toHaveBeenCalledWith(['received', 'preparing']);
    expect(queue.map((o) => [o.id, o.score])).toEqual([
      [2, 40],
      [1, 10],
    ]);
  });

  test('an invalid filter never reaches the repository', async () => {
    await expect(getQueue({ status: 'ready', now: NOW })).rejects.toMatchObject({
      code: 'INVALID_STATUS_FILTER',
    });
    expect(repository.findOrdersByStatuses).not.toHaveBeenCalled();
  });
});

describe('ready and finished views', () => {
  test('ready: loads ready orders, longest waiting for pickup first', async () => {
    repository.findOrdersByStatuses.mockResolvedValue([buildOrder({ id: 3, status: 'ready', status_changed_at: minutesAgo(8) })]);

    const [order] = await getReadyOrders({ now: NOW });

    expect(repository.findOrdersByStatuses).toHaveBeenCalledWith(['ready'], { byStatusChange: 'ASC' });
    expect(order).toMatchObject({ id: 3, minutes_in_status: 8, allowed_actions: ['pickup'] });
  });

  test('finished: picked up and cancelled, most recent first, capped', async () => {
    repository.findOrdersByStatuses.mockResolvedValue([]);

    await getFinishedOrders({ now: NOW });

    expect(repository.findOrdersByStatuses).toHaveBeenCalledWith(['picked_up', 'cancelled'], {
      byStatusChange: 'DESC',
      limit: FINISHED_LIMIT,
    });
  });
});

describe('createOrder', () => {
  const input = { customer_name: 'Nora', type: 'dine_in', items: [{ menu_item_id: 1, quantity: 1 }, { menu_item_id: 9, quantity: 2 }] };

  test('an unknown menu item is a validation error and nothing is written', async () => {
    repository.findExistingMenuItemIds.mockResolvedValue([1]);

    await expect(createOrder({ input, now: NOW })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { errors: [{ field: 'items[1].menu_item_id', message: 'menu item 9 does not exist' }] },
    });
    expect(repository.createOrder).not.toHaveBeenCalled();
  });

  test('stores a received order placed now', async () => {
    repository.findExistingMenuItemIds.mockResolvedValue([1, 9]);
    repository.createOrder.mockResolvedValue(42);
    repository.findOrderById.mockResolvedValue(buildOrder({ id: 42, type: 'dine_in' }));

    const order = await createOrder({ input, now: NOW });

    expect(repository.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ customer_name: 'Nora', status: 'received', placed_at: NOW, status_changed_at: NOW }),
    );
    expect(order).toMatchObject({ id: 42, score: 30, allowed_actions: ['start', 'cancel'] });
  });
});

describe('transitionOrder', () => {
  test('moves the order with a conditional update from its current status', async () => {
    repository.findOrderById.mockResolvedValue(buildOrder({ id: 7, status: 'received' }));
    repository.updateStatusIfCurrent.mockResolvedValue(true);

    const order = await transitionOrder({ id: 7, action: 'start', now: NOW });

    expect(repository.updateStatusIfCurrent).toHaveBeenCalledWith(7, 'received', 'preparing', NOW);
    expect(order).toMatchObject({
      id: 7,
      status: 'preparing',
      status_changed_at: NOW,
      minutes_in_status: 0,
      allowed_actions: ['ready'],
    });
  });

  test('unknown order -> ORDER_NOT_FOUND, nothing written', async () => {
    repository.findOrderById.mockResolvedValue(null);

    await expect(transitionOrder({ id: 7, action: 'start', now: NOW })).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
    });
    expect(repository.updateStatusIfCurrent).not.toHaveBeenCalled();
  });

  test('illegal transition -> INVALID_TRANSITION, nothing written', async () => {
    repository.findOrderById.mockResolvedValue(buildOrder({ id: 7, status: 'preparing' }));

    await expect(transitionOrder({ id: 7, action: 'start', now: NOW })).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
    expect(repository.updateStatusIfCurrent).not.toHaveBeenCalled();
  });

  test('lost race: another request changed the status first -> INVALID_TRANSITION with the new status', async () => {
    repository.findOrderById
      .mockResolvedValueOnce(buildOrder({ id: 7, status: 'received' })) // our read
      .mockResolvedValueOnce(buildOrder({ id: 7, status: 'cancelled' })); // after the other request
    repository.updateStatusIfCurrent.mockResolvedValue(false);

    await expect(transitionOrder({ id: 7, action: 'start', now: NOW })).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
      details: { action: 'start', current_status: 'cancelled' },
    });
  });
});
