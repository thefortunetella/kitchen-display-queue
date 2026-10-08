// Serializes every error as { error: { code, message, details } }.
const { AppError } = require('../errors');

function sendError(res, error) {
  res.status(error.httpStatus).json({
    error: { code: error.code, message: error.message, details: error.details },
  });
}

function notFoundHandler(req, res) {
  sendError(res, new AppError('ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}.`));
}

// Express identifies error middleware by its four parameters.
function errorHandler(error, req, res, next) {
  // Response already started: let Express close the connection.
  if (res.headersSent) return next(error);

  if (error instanceof AppError) return sendError(res, error);

  // 4xx raised by Express itself, e.g. malformed URL encoding.
  if (error.status >= 400 && error.status < 500) {
    return sendError(res, new AppError('BAD_REQUEST', 'The request is malformed.'));
  }

  // Unexpected: log the cause, return a generic message.
  console.error(error);
  return sendError(res, new AppError('INTERNAL_ERROR', 'Unexpected server error.'));
}

module.exports = { notFoundHandler, errorHandler };
