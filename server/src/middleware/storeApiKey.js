/**
 * Store API key middleware.
 * Protects /api/store endpoints with X-STORE-KEY.
 */

function requireStoreApiKey(req, res, next) {
  const expectedKey = (process.env.STORE_API_KEY || '').trim();
  const providedKey = (req.header('X-STORE-KEY') || '').trim();

  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: invalid store key',
    });
  }

  return next();
}

module.exports = { requireStoreApiKey };
