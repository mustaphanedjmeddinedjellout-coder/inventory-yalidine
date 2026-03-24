/**
 * Product Routes
 * CRUD operations for products and their variants.
 */

const express = require('express');
const router = express.Router();
const productService = require('../services/productService');
const { db } = require('../db/connection');
const { success, error } = require('../utils/response');

function validateStockSql(statement) {
  const normalized = statement.trim().replace(/\s+/g, ' ');

  if (!normalized) return 'SQL is required';

  if (normalized.includes(';')) {
    return 'Only one SQL statement is allowed';
  }

  if (/--|\/\*/.test(normalized)) {
    return 'SQL comments are not allowed';
  }

  if (/(drop|delete|insert|alter|create|pragma|attach|detach|vacuum|truncate)\b/i.test(normalized)) {
    return 'Only stock update statements are allowed';
  }

  const match = normalized.match(/^update\s+product_variants\s+set\s+(.+)\s+where\s+(.+)$/i);
  if (!match) {
    return 'Only UPDATE product_variants ... WHERE ... is allowed';
  }

  const setClause = match[1].trim();
  if (/\,/.test(setClause)) {
    return 'Only quantity can be updated';
  }

  if (!/^quantity\s*=\s*.+$/i.test(setClause)) {
    return 'Only quantity assignment is allowed in SET clause';
  }

  return null;
}

function ensureAdminPassword(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD;
  if (!expected) {
    return error(res, 'Admin password is not configured on the server', 503);
  }

  const provided = req.header('X-ADMIN-PASSWORD');
  if (!provided || provided !== expected) {
    return error(res, 'Unauthorized', 401);
  }

  return next();
}

// GET /api/products - List all products
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      search: req.query.search,
    };
    const products = await productService.getAll(filters);
    success(res, products);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/products/for-order - Products with available variants for order creation
router.get('/for-order', async (req, res) => {
  try {
    const products = await productService.getProductsForOrder();
    success(res, products);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/products/low-stock - Low stock variants
router.get('/low-stock', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const items = await productService.getLowStock(threshold);
    success(res, items);
  } catch (err) {
    error(res, err.message);
  }
});

// POST /api/products/stock-sql - Execute controlled SQL to update variant quantity
router.post('/stock-sql', ensureAdminPassword, async (req, res) => {
  try {
    const sqlInput = String(req.body?.sql || '').trim();
    const statement = sqlInput.replace(/;+\s*$/, '');
    const validationError = validateStockSql(statement);
    if (validationError) {
      return error(res, validationError, 400);
    }

    const result = await db.execute({ sql: statement });
    success(res, { rowsAffected: result.rowsAffected || 0 });
  } catch (err) {
    error(res, err.message, 400);
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await productService.getById(parseInt(req.params.id));
    if (!product) return error(res, 'المنتج غير موجود', 404);
    success(res, product);
  } catch (err) {
    error(res, err.message);
  }
});

// POST /api/products - Create a product
router.post('/', async (req, res) => {
  try {
    const { model_name, category, selling_price, cost_price } = req.body;

    if (!model_name || !category || selling_price == null || cost_price == null) {
      return error(res, 'جميع الحقول المطلوبة يجب تعبئتها', 400);
    }

    if (!['T-Shirt', 'Pants', 'Shoes'].includes(category)) {
      return error(res, 'فئة غير صالحة', 400);
    }

    const product = await productService.create(req.body);
    success(res, product, 201);
  } catch (err) {
    error(res, err.message);
  }
});

// PUT /api/products/:id - Update a product
router.put('/:id', async (req, res) => {
  try {
    const existing = await productService.getById(parseInt(req.params.id));
    if (!existing) return error(res, 'المنتج غير موجود', 404);

    const product = await productService.update(parseInt(req.params.id), req.body);
    success(res, product);
  } catch (err) {
    error(res, err.message);
  }
});

// DELETE /api/products/:id - Delete a product
router.delete('/:id', async (req, res) => {
  try {
    const existing = await productService.getById(parseInt(req.params.id));
    if (!existing) return error(res, 'المنتج غير موجود', 404);

    await productService.delete(parseInt(req.params.id));
    success(res, { message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    error(res, err.message);
  }
});

module.exports = router;
