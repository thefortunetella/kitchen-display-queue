const { parseNewOrder } = require('../../src/modules/new-order');

const valid = {
  customer_name: '  Nora Blake ',
  type: 'takeout',
  is_vip: true,
  promised_at: '2026-06-15T12:30:00Z',
  items: [{ menu_item_id: 3, quantity: 2 }],
};

const fieldsOf = (fn) => {
  try {
    fn();
  } catch (error) {
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', httpStatus: 400 });
    return error.details.errors.map((e) => e.field);
  }
  throw new Error('expected a VALIDATION_ERROR');
};

describe('parseNewOrder', () => {
  test('returns the normalized order', () => {
    expect(parseNewOrder(valid)).toEqual({
      customer_name: 'Nora Blake',
      type: 'takeout',
      is_vip: true,
      promised_at: new Date('2026-06-15T12:30:00Z'),
      items: [{ menu_item_id: 3, quantity: 2 }],
    });
  });

  test('is_vip defaults to false and promised_at to null', () => {
    const body = { customer_name: 'Nora', type: 'dine_in', items: [{ menu_item_id: 3, quantity: 1 }] };
    expect(parseNewOrder(body)).toMatchObject({ is_vip: false, promised_at: null });
  });

  test.each([
    ['missing items', { ...valid, items: undefined }, ['items']],
    ['empty items', { ...valid, items: [] }, ['items']],
    ['zero quantity', { ...valid, items: [{ menu_item_id: 3, quantity: 0 }] }, ['items[0].quantity']],
    ['fractional quantity', { ...valid, items: [{ menu_item_id: 3, quantity: 1.5 }] }, ['items[0].quantity']],
    ['quantity as a string', { ...valid, items: [{ menu_item_id: 3, quantity: '2' }] }, ['items[0].quantity']],
    ['invalid menu item id', { ...valid, items: [{ menu_item_id: -1, quantity: 1 }] }, ['items[0].menu_item_id']],
    ['blank customer name', { ...valid, customer_name: '   ' }, ['customer_name']],
    ['unknown type', { ...valid, type: 'catering' }, ['type']],
    ['non-boolean is_vip', { ...valid, is_vip: 'yes' }, ['is_vip']],
    ['invalid promised_at', { ...valid, promised_at: 'tomorrow' }, ['promised_at']],
  ])('rejects %s', (_label, body, fields) => {
    expect(fieldsOf(() => parseNewOrder(body))).toEqual(fields);
  });

  test('reports every problem at once', () => {
    const body = { type: 'catering', items: [{ menu_item_id: 1, quantity: 0 }] };
    expect(fieldsOf(() => parseNewOrder(body))).toEqual(['customer_name', 'type', 'items[0].quantity']);
  });

  test.each([null, 'text', []])('rejects a body that is not an object: %p', (body) => {
    expect(fieldsOf(() => parseNewOrder(body))).toEqual(['customer_name', 'type', 'items']);
  });
});
