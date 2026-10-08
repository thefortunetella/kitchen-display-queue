// Validation of a new order's payload. Pure: checks that need the database live in the module.
const { AppError } = require('../errors');

const ORDER_TYPES = ['dine_in', 'takeout', 'delivery'];
const MAX_DB_INTEGER = 2147483647;

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0 && value <= MAX_DB_INTEGER;

function invalidOrder(errors) {
  return new AppError('VALIDATION_ERROR', 'The order is invalid.', { errors });
}

// Collects every problem instead of stopping at the first one, so a client can fix them all at once.
function parseNewOrder(body) {
  const input = body !== null && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const { customer_name, type, is_vip = false, promised_at = null, items } = input;
  const errors = [];

  if (typeof customer_name !== 'string' || customer_name.trim() === '') {
    errors.push({ field: 'customer_name', message: 'must be a non-empty string' });
  }
  if (!ORDER_TYPES.includes(type)) {
    errors.push({ field: 'type', message: `must be one of: ${ORDER_TYPES.join(', ')}` });
  }
  if (typeof is_vip !== 'boolean') {
    errors.push({ field: 'is_vip', message: 'must be a boolean' });
  }
  if (promised_at !== null && (typeof promised_at !== 'string' || Number.isNaN(Date.parse(promised_at)))) {
    errors.push({ field: 'promised_at', message: 'must be an ISO 8601 timestamp or null' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    errors.push({ field: 'items', message: 'must be a non-empty array' });
  } else {
    items.forEach((item, index) => {
      if (!isPositiveInteger(item?.menu_item_id)) {
        errors.push({ field: `items[${index}].menu_item_id`, message: 'must be a positive integer' });
      }
      if (!isPositiveInteger(item?.quantity)) {
        errors.push({ field: `items[${index}].quantity`, message: 'must be a positive integer' });
      }
    });
  }

  if (errors.length > 0) throw invalidOrder(errors);

  return {
    customer_name: customer_name.trim(),
    type,
    is_vip,
    promised_at: promised_at === null ? null : new Date(promised_at),
    items: items.map(({ menu_item_id, quantity }) => ({ menu_item_id, quantity })),
  };
}

module.exports = { parseNewOrder, invalidOrder };
