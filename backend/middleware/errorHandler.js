// Consistent API envelope + centralized error handling.
// Every route returns { success: true, data } or { success: false, error }.

/** Wrap an async route handler so thrown errors reach the error middleware. */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Success envelope. Extra top-level fields (e.g. stale: true) via `extra`. */
export function ok(res, data, extra = {}) {
  return res.json({ success: true, data, ...extra });
}

/** Throwable error with an HTTP status attached. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: `Not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }
  res.status(status).json({ success: false, error: message });
}
