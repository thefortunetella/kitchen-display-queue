const { AppError, ERROR_HTTP_STATUS } = require('../../src/errors');

describe('AppError', () => {
  test('carries the code, its HTTP status, the message and details', () => {
    const error = new AppError('ORDER_NOT_FOUND', 'Order 7 not found.', { id: 7 });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      code: 'ORDER_NOT_FOUND',
      httpStatus: 404,
      message: 'Order 7 not found.',
      details: { id: 7 },
    });
  });

  test('every documented code maps to a 4xx or 5xx status', () => {
    for (const status of Object.values(ERROR_HTTP_STATUS)) {
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
  });

  test('an unknown code is a programming error and throws immediately', () => {
    expect(() => new AppError('ORDER_NOT_FOUNDD', 'typo')).toThrow(TypeError);
  });
});
