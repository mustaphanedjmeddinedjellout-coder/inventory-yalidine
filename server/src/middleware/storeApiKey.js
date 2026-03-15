const { error } = require('../utils/response');

function storeApiKey(req, res, next) {
  const expected = process.env.STORE_API_KEY;
  if (!expected) {
    return next();
  }

  const token = req.header('X-STORE-KEY');
  if (!token || token !== expected) {
    return error(res, 'Unauthorized', 401);
  }

  return next();
}

module.exports = storeApiKey;
