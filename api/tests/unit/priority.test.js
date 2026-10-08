const { computeScore } = require('../../src/modules/priority');
const { rankQueue } = require('../../src/modules/queue');
const { NOW, minutesAgo, minutesFromNow, MENU, item, buildOrder } = require('../fixtures');

const BASE = 10; // buildOrder() is a delivery order with nothing else scoring

describe('computeScore: spec worked examples (now = 2026-06-15T12:00:00Z)', () => {
  test('Example A: dine_in, 35 min waiting, no promise, 50 prep minutes = 60', () => {
    const exampleA = buildOrder({
      type: 'dine_in',
      placed_at: new Date('2026-06-15T11:25:00Z'),
      items: [item(MENU.grilledSalmon, 2), item(MENU.caesarSalad, 1)],
    });
    expect(computeScore(exampleA, NOW)).toBe(60);
  });

  test('Example B: delivery VIP, 10 min waiting, promised in 20 min, 12 prep minutes = 60', () => {
    const exampleB = buildOrder({
      type: 'delivery',
      is_vip: true,
      placed_at: new Date('2026-06-15T11:50:00Z'),
      promised_at: new Date('2026-06-15T12:20:00Z'),
      items: [item(MENU.margheritaPizza, 1)],
    });
    expect(computeScore(exampleB, NOW)).toBe(60);
  });
});

describe('computeScore: order type and VIP', () => {
  test.each([
    ['dine_in', 30],
    ['takeout', 20],
    ['delivery', 10],
  ])('%s scores %i', (type, points) => {
    expect(computeScore(buildOrder({ type }), NOW)).toBe(points);
  });

  test('VIP adds 20', () => {
    expect(computeScore(buildOrder({ is_vip: true }), NOW)).toBe(BASE + 20);
  });

  test('an order type without a weight throws instead of scoring 0', () => {
    expect(() => computeScore(buildOrder({ type: 'catering' }), NOW)).toThrow(/catering/);
  });
});

describe('computeScore: wait time: min(40, floor(minutes_waiting / 10) * 5)', () => {
  test('9 minutes 50 seconds is 9 whole minutes -> 0 points', () => {
    const placedAt = new Date(NOW.getTime() - (9 * 60 + 50) * 1000);
    expect(computeScore(buildOrder({ placed_at: placedAt }), NOW)).toBe(BASE + 0);
  });

  test.each([
    [10, 5],
    [35, 15],
    [79, 35],
  ])('%i minutes waiting -> %i points', (minutes, points) => {
    expect(computeScore(buildOrder({ placed_at: minutesAgo(minutes) }), NOW)).toBe(BASE + points);
  });

  test.each([80, 95, 600])('cap: %i minutes waiting -> 40 points', (minutes) => {
    expect(computeScore(buildOrder({ placed_at: minutesAgo(minutes) }), NOW)).toBe(BASE + 40);
  });

  test('placed_at in the future (clock skew) counts as 0 minutes, not negative points', () => {
    expect(computeScore(buildOrder({ placed_at: minutesFromNow(15) }), NOW)).toBe(BASE + 0);
  });
});

describe('computeScore: promised time buckets (whole minutes until promised_at)', () => {
  const plusSeconds = (minutes, seconds) => new Date(minutesFromNow(minutes).getTime() + seconds * 1000);

  test.each([
    ['null (no promise)', null, 0],
    ['20 minutes away', minutesFromNow(20), 25],
    ['exactly 30 minutes away', minutesFromNow(30), 25],
    ['30m59s away (30 whole minutes)', plusSeconds(30, 59), 25],
    ['31 minutes away', minutesFromNow(31), 15],
    ['45 minutes away', minutesFromNow(45), 15],
    ['60m59s away (60 whole minutes)', plusSeconds(60, 59), 15],
    ['61 minutes away', minutesFromNow(61), 0],
    ['3 hours away', minutesFromNow(180), 0],
    ['due right now', NOW, 25],
    ['already overdue by 10 minutes', minutesAgo(10), 25],
  ])('promised_at %s -> %i points', (_label, promisedAt, points) => {
    expect(computeScore(buildOrder({ promised_at: promisedAt }), NOW)).toBe(BASE + points);
  });
});

describe('computeScore: complexity: min(20, floor(total_prep_minutes / 15) * 5)', () => {
  test.each([
    ['12 min (1x Pizza)', [item(MENU.margheritaPizza, 1)], 0],
    ['20 min (1x Salmon)', [item(MENU.grilledSalmon, 1)], 5],
    ['50 min (2x Salmon + 1x Caesar)', [item(MENU.grilledSalmon, 2), item(MENU.caesarSalad, 1)], 15],
  ])('%s -> %i points', (_label, items, points) => {
    expect(computeScore(buildOrder({ items }), NOW)).toBe(BASE + points);
  });

  test('quantity multiplies prep time: 3x Salmon = 60 min -> cap of 20', () => {
    expect(computeScore(buildOrder({ items: [item(MENU.grilledSalmon, 3)] }), NOW)).toBe(BASE + 20);
  });

  test('cap: 120 prep minutes still gives 20', () => {
    expect(computeScore(buildOrder({ items: [item(MENU.grilledSalmon, 6)] }), NOW)).toBe(BASE + 20);
  });
});

describe('computeScore: the rest of the formula can beat the type weight', () => {
  test('a delivery VIP with a tight promise outranks a dine_in non-VIP', () => {
    const dineIn = buildOrder({ id: 1, type: 'dine_in', placed_at: minutesAgo(20) });
    const deliveryVip = buildOrder({
      id: 2,
      type: 'delivery',
      is_vip: true,
      placed_at: minutesAgo(20),
      promised_at: minutesFromNow(15),
    });

    expect(computeScore(dineIn, NOW)).toBe(30 + 10); // type + wait
    expect(computeScore(deliveryVip, NOW)).toBe(10 + 20 + 10 + 25); // type + VIP + wait + promise

    const queue = rankQueue([dineIn, deliveryVip], NOW);
    expect(queue.map((o) => o.id)).toEqual([2, 1]);
  });
});

describe('scoreBreakdown: the points of each part of the formula', () => {
  const { scoreBreakdown, PRIORITY_RULES } = require('../../src/modules/priority');

  const exampleA = buildOrder({
    type: 'dine_in',
    placed_at: new Date('2026-06-15T11:25:00Z'),
    items: [item(MENU.grilledSalmon, 2), item(MENU.caesarSalad, 1)],
  });

  test('spec Example A: 30 + 0 + 15 + 0 + 15', () => {
    expect(scoreBreakdown(exampleA, NOW)).toEqual({ type: 30, vip: 0, wait: 15, promise: 0, complexity: 15 });
  });

  test.each([
    ['spec Example A', exampleA],
    ['a late VIP delivery', buildOrder({ is_vip: true, placed_at: minutesAgo(95), promised_at: minutesAgo(5), items: [item(MENU.grilledSalmon, 4)] })],
    ['an empty takeout order', buildOrder({ type: 'takeout' })],
  ])('the parts always add up to computeScore: %s', (_label, order) => {
    const parts = Object.values(scoreBreakdown(order, NOW));
    expect(parts.reduce((sum, points) => sum + points, 0)).toBe(computeScore(order, NOW));
  });

  test('follows the rules: a changed weight changes the part and the score together', () => {
    const rules = { ...PRIORITY_RULES, vipPoints: 30 };
    const order = buildOrder({ is_vip: true });
    expect(scoreBreakdown(order, NOW, rules).vip).toBe(30);
    expect(computeScore(order, NOW, rules)).toBe(BASE + 30);
  });
});
