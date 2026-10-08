// Stable error codes and their HTTP status. Listed in the README.
const ERROR_HTTP_STATUS = {
  BAD_REQUEST: 400,
  INVALID_ORDER_ID: 400,
  INVALID_STATUS_FILTER: 400,
  VALIDATION_ERROR: 400,
  ORDER_NOT_FOUND: 404,
  ROUTE_NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  INTERNAL_ERROR: 500,
};

// Expected, client-facing error; serialized by the error handler.
class AppError extends Error {
  constructor(code, message, details) {
    // An unknown code is a programming error.
    if (!(code in ERROR_HTTP_STATUS)) throw new TypeError(`Unknown error code "${code}"`);
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS[code];
    this.details = details;
  }
}

module.exports = { AppError, ERROR_HTTP_STATUS };
