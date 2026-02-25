/**
 * Product Routes
 * CRUD operations for products and their variants.
 */

const express = require('express');
const router = express.Router();
const productService = require('../services/productService');
const { success, error } = require('../utils/response');

// GET /api/products - List all products
router.get('/', (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      search: req.query.search,
    };
    const products = productService.getAll(filters);
    success(res, products);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/products/for-order - Products with available variants for order creation
router.get('/for-order', (req, res) => {
  try {
    const products = productService.getProductsForOrder();
    success(res, products);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/products/low-stock - Low stock variants
router.get('/low-stock', (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const items = productService.getLowStock(threshold);
    success(res, items);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', (req, res) => {
  try {
    const product = productService.getById(parseInt(req.params.id));
    if (!product) return error(res, 'المنتج غير موجود', 404);
    success(res, product);
  } catch (err) {
    error(res, err.message);
  }
});

// POST /api/products - Create a product
router.post('/', (req, res) => {
  try {
    const { model_name, category, selling_price, cost_price } = req.body;

    // Validation
    if (!model_name || !category || selling_price == null || cost_price == null) {
      return error(res, 'جميع الحقول المطلوبة يجب تعبئتها', 400);
    }

    if (!['T-Shirt', 'Pants', 'Shoes'].includes(category)) {
      return error(res, 'فئة غير صالحة', 400);
    }

    const product = productService.create(req.body);
    success(res, product, 201);
  } catch (err) {
    error(res, err.message);
  }
});

// PUT /api/products/:id - Update a product
router.put('/:id', (req, res) => {
  try {
    const existing = productService.getById(parseInt(req.params.id));
    if (!existing) return error(res, 'المنتج غير موجود', 404);

    const product = productService.update(parseInt(req.params.id), req.body);
    success(res, product);
  } catch (err) {
    error(res, err.message);
  }
});

// DELETE /api/products/:id - Delete a product
router.delete('/:id', (req, res) => {
  try {
    const existing = productService.getById(parseInt(req.params.id));
    if (!existing) return error(res, 'المنتج غير موجود', 404);

    productService.delete(parseInt(req.params.id));
    success(res, { message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    error(res, err.message);
  }
});

module.exports = router;
