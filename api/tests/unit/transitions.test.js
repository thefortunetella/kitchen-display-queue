const { resolveTransition, allowedActions } = require('../../src/modules/transitions');

const STATUSES = ['received', 'preparing', 'ready', 'picked_up', 'cancelled'];
const ACTIONS = ['start', 'ready', 'pickup', 'cancel'];

// Expected moves, written independently of TRANSITIONS.
const LEGAL = {
  'received:start': 'preparing',
  'received:cancel': 'cancelled',
  'preparing:ready': 'ready',
  'ready:pickup': 'picked_up',
};

const expectInvalidTransition = (status, action) =>
  expect(() => resolveTransition(status, action)).toThrow(
    expect.objectContaining({
      code: 'INVALID_TRANSITION',
      httpStatus: 409,
      details: expect.objectContaining({ action, current_status: status }),
    }),
  );

describe('resolveTransition: legal transitions succeed', () => {
  test.each(Object.entries(LEGAL))('%s -> %s', (key, expected) => {
    const [status, action] = key.split(':');
    expect(resolveTransition(status, action)).toBe(expected);
  });
});

describe('resolveTransition: every other status/action pair is rejected', () => {
  const illegal = STATUSES.flatMap((status) => ACTIONS.map((action) => [status, action])).filter(
    ([status, action]) => !LEGAL[`${status}:${action}`],
  );

  test.each(illegal)('%s + %s -> INVALID_TRANSITION', (status, action) => {
    expectInvalidTransition(status, action);
  });
});

describe('resolveTransition: the cases the spec names', () => {
  test('skipping a step: received cannot jump to ready', () => {
    expectInvalidTransition('received', 'ready');
  });

  test('skipping a step: preparing cannot be picked up', () => {
    expectInvalidTransition('preparing', 'pickup');
  });

  test('repeating: starting an order that is already preparing is an error, not a no-op', () => {
    expectInvalidTransition('preparing', 'start');
  });

  test('repeating: marking a ready order ready again is an error', () => {
    expectInvalidTransition('ready', 'ready');
  });

  test.each(ACTIONS)('terminal: a picked_up order cannot %s', (action) => {
    expectInvalidTransition('picked_up', action);
  });

  test.each(ACTIONS)('terminal: a cancelled order cannot %s', (action) => {
    expectInvalidTransition('cancelled', action);
  });

  test('cancel is only for received orders', () => {
    expectInvalidTransition('preparing', 'cancel');
  });
});

describe('allowedActions: what the UI may offer for each status', () => {
  test.each([
    ['received', ['start', 'cancel']],
    ['preparing', ['ready']],
    ['ready', ['pickup']],
    ['picked_up', []],
    ['cancelled', []],
  ])('%s -> %j', (status, actions) => {
    expect(allowedActions(status)).toEqual(actions);
  });
});
