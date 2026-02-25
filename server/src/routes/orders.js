/**
 * Order Routes
 * Create, list, view, and delete orders.
 */

const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const { success, error } = require('../utils/response');

// GET /api/orders - List orders with optional date filters
router.get('/', (req, res) => {
  try {
    const filters = {
      date: req.query.date,
      from: req.query.from,
      to: req.query.to,
    };
    const orders = orderService.getAll(filters);
    success(res, orders);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/orders/:id - Get single order with items
router.get('/:id', (req, res) => {
  try {
    const order = orderService.getById(parseInt(req.params.id));
    if (!order) return error(res, 'الطلب غير موجود', 404);
    success(res, order);
  } catch (err) {
    error(res, err.message);
  }
});

// POST /api/orders - Create a new order
router.post('/', (req, res) => {
  try {
    const order = orderService.create(req.body);
    success(res, order, 201);
  } catch (err) {
    error(res, err.message, 400);
  }
});

// DELETE /api/orders/:id - Delete order (restores stock)
router.delete('/:id', (req, res) => {
  try {
    const existing = orderService.getById(parseInt(req.params.id));
    if (!existing) return error(res, 'الطلب غير موجود', 404);

    orderService.delete(parseInt(req.params.id));
    success(res, { message: 'تم حذف الطلب بنجاح واستعادة المخزون' });
  } catch (err) {
    error(res, err.message);
  }
});

module.exports = router;
