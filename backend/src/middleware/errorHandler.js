// middleware/errorHandler.js
// Centralized error handler for Express apps.
// Logs full error details to the server console and returns a helpful JSON response.
// In development it also returns the stack trace to the client (useful for debugging).

module.exports = (err, req, res, next) => {
  // Normalize non-Error throws
  if (!(err instanceof Error)) {
    err = new Error(String(err));
  }

  // Log full error info for debugging
  console.error('🔥 Error caught by errorHandler:');
  console.error('name:', err.name);
  console.error('message:', err.message);
  if (err.code) console.error('code:', err.code);
  console.error('stack:', err.stack);

  const status = err.statusCode || err.status || 500;

  // Base response
  const response = {
    success: false,
    message: err.message || 'Internal Server Error'
  };

  // Mongoose validation error (common)
  if (err.name === 'ValidationError' && err.errors) {
    response.errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(response);
  }

  // express-validator formatted errors (if you forward them as an Error-like object)
  if (typeof err.array === 'function') {
    response.errors = err.array();
    return res.status(400).json(response);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ ...response, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ ...response, message: 'Token expired' });
  }

  // Include stack trace in response when in development (DO NOT enable in production)
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    if (err.code) response.code = err.code;
  }

  return res.status(status).json(response);
};
