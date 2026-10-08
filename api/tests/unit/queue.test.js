const { rankQueue, resolveQueueStatuses } = require('../../src/modules/queue');
const { NOW, minutesAgo, minutesFromNow, MENU, item, buildOrder } = require('../fixtures');

const ids = (queue) => queue.map((order) => order.id);

describe('rankQueue: ordering', () => {
  test('sorts by score, highest first', () => {
    const low = buildOrder({ id: 1, type: 'delivery' }); // 10
    const high = buildOrder({ id: 2, type: 'dine_in' }); // 30
    const mid = buildOrder({ id: 3, type: 'takeout' }); // 20

    expect(ids(rankQueue([low, high, mid], NOW))).toEqual([2, 3, 1]);
  });

  test('spec Example A vs B: both 60, B wins because it has a promised_at and A does not', () => {
    const exampleA = buildOrder({
      id: 1,
      type: 'dine_in',
      placed_at: minutesAgo(35),
      items: [item(MENU.grilledSalmon, 2), item(MENU.caesarSalad, 1)],
    });
    const exampleB = buildOrder({
      id: 2,
      is_vip: true,
      placed_at: minutesAgo(10),
      promised_at: minutesFromNow(20),
      items: [item(MENU.margheritaPizza, 1)],
    });

    const queue = rankQueue([exampleA, exampleB], NOW);
    expect(queue.map((o) => o.score)).toEqual([60, 60]);
    expect(ids(queue)).toEqual([2, 1]);
  });
});

describe('rankQueue: tie-break on equal score', () => {
  // Both promises are more than 60 minutes away, so they score the same (0) but differ in time.
  test('1. earlier promised_at first', () => {
    const later = buildOrder({ id: 1, promised_at: minutesFromNow(120) });
    const earlier = buildOrder({ id: 2, promised_at: minutesFromNow(90) });

    expect(ids(rankQueue([later, earlier], NOW))).toEqual([2, 1]);
  });

  test('1. null promised_at goes last', () => {
    const noPromise = buildOrder({ id: 1, promised_at: null });
    const withPromise = buildOrder({ id: 2, promised_at: minutesFromNow(240) });

    expect(ids(rankQueue([noPromise, withPromise], NOW))).toEqual([2, 1]);
  });

  test('2. same promised_at -> earlier placed_at first', () => {
    // 1 and 4 minutes ago are both under 10 minutes: same wait points.
    const newer = buildOrder({ id: 1, placed_at: minutesAgo(1) });
    const older = buildOrder({ id: 2, placed_at: minutesAgo(4) });

    expect(ids(rankQueue([newer, older], NOW))).toEqual([2, 1]);
  });

  test('3. everything equal -> smaller id first', () => {
    const second = buildOrder({ id: 8 });
    const first = buildOrder({ id: 3 });

    expect(ids(rankQueue([second, first], NOW))).toEqual([3, 8]);
  });
});

describe('rankQueue: values computed at request time', () => {
  test('adds score, wait_minutes, minutes_until_promised and allowed_actions without changing the input', () => {
    const order = buildOrder({ type: 'dine_in', placed_at: minutesAgo(35), status: 'received' });

    const [entry] = rankQueue([order], NOW);

    expect(entry).toMatchObject({
      score: 45,
      wait_minutes: 35,
      minutes_until_promised: null,
      minutes_in_status: 0,
      allowed_actions: ['start', 'cancel'],
    });
    expect(order).not.toHaveProperty('score');
  });

  test.each([
    ['20 minutes ahead', minutesFromNow(20), 20],
    ['30m59s ahead (floored, like the score bucket)', new Date(minutesFromNow(30).getTime() + 59 * 1000), 30],
    ['5 minutes overdue', minutesAgo(5), -5],
  ])('minutes_until_promised for a promise %s = %i', (_label, promisedAt, expected) => {
    const [entry] = rankQueue([buildOrder({ promised_at: promisedAt })], NOW);

    expect(entry.minutes_until_promised).toBe(expected);
  });
});

describe('resolveQueueStatuses: which statuses the queue shows', () => {
  test('default queue is received + preparing only (no ready, picked_up or cancelled)', () => {
    const statuses = resolveQueueStatuses(undefined);

    expect(statuses).toEqual(['received', 'preparing']);
    expect(statuses).not.toContain('ready');
    expect(statuses).not.toContain('picked_up');
    expect(statuses).not.toContain('cancelled');
  });

  test.each(['received', 'preparing'])('status=%s narrows the queue to that status', (status) => {
    expect(resolveQueueStatuses(status)).toEqual([status]);
  });

  test.each(['ready', 'picked_up', 'cancelled', 'banana', ''])('status=%p is rejected', (status) => {
    expect(() => resolveQueueStatuses(status)).toThrow(
      expect.objectContaining({ code: 'INVALID_STATUS_FILTER', httpStatus: 400 }),
    );
  });
});

describe('ahead_of_next: which criterion placed each order above the next one', () => {
  const ahead = (orders) => rankQueue(orders, NOW).map((o) => o.ahead_of_next);

  test('higher score', () => {
    expect(ahead([buildOrder({ id: 1 }), buildOrder({ id: 2, type: 'dine_in' })])[0]).toEqual({ order_id: 1, decided_by: 'score' });
  });

  test('tie: a promised time beats no promised time (spec Example B over A)', () => {
    const [first] = ahead([buildOrder({ id: 1 }), buildOrder({ id: 2, promised_at: minutesFromNow(240) })]);
    expect(first).toEqual({ order_id: 1, decided_by: 'promised_at' });
  });

  test('tie: placed earlier', () => {
    const [first] = ahead([buildOrder({ id: 1, placed_at: minutesAgo(1) }), buildOrder({ id: 2, placed_at: minutesAgo(4) })]);
    expect(first).toEqual({ order_id: 1, decided_by: 'placed_at' });
  });

  test('tie on everything: lower order number', () => {
    const [first] = ahead([buildOrder({ id: 8 }), buildOrder({ id: 3 })]);
    expect(first).toEqual({ order_id: 8, decided_by: 'id' });
  });

  test('the last order has no one below it', () => {
    expect(ahead([buildOrder({ id: 1 }), buildOrder({ id: 2 })]).at(-1)).toBeNull();
  });
});
