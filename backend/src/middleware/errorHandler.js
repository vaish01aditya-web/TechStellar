/* eslint-disable no-unused-vars */

/** Wraps async route handlers so thrown errors reach errorHandler instead of hanging the request. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Must be registered last, after all routes. */
function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}]`, err);

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }
  if (err.name === 'ZodError' || err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid input.', details: err.errors || err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  });
}

module.exports = { asyncHandler, errorHandler };
