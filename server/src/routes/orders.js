/**
 * Order Routes
 * Create, list, view, and delete orders.
 */

const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const { success, error } = require('../utils/response');

// GET /api/orders - List orders with optional date filters
router.get('/', async (req, res) => {
  try {
    const filters = {
      date: req.query.date,
      from: req.query.from,
      to: req.query.to,
    };
    const shouldSyncYalidine = req.query.sync !== '0';
    const orders = await orderService.getAll(filters, { syncYalidine: shouldSyncYalidine });
    success(res, orders);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/orders/:id - Get single order with items
router.get('/:id', async (req, res) => {
  try {
    const order = await orderService.getById(parseInt(req.params.id));
    if (!order) return error(res, 'الطلب غير موجود', 404);
    success(res, order);
  } catch (err) {
    error(res, err.message);
  }
});

// POST /api/orders - Create a new order
router.post('/', async (req, res) => {
  try {
    const order = await orderService.create(req.body);
    success(res, order, 201);
  } catch (err) {
    error(res, err.message, 400);
  }
});

// POST /api/orders/:id/approve - Approve and send to Yalidine
router.post('/:id/approve', async (req, res) => {
  try {
    const order = await orderService.approve(parseInt(req.params.id));
    success(res, order);
  } catch (err) {
    error(res, err.message, 400);
  }
});

// POST /api/orders/:id/sync-status - Sync status from Yalidine tracking API
router.post('/:id/sync-status', async (req, res) => {
  try {
    const order = await orderService.syncYalidineStatus(parseInt(req.params.id));
    success(res, order);
  } catch (err) {
    error(res, err.message, 400);
  }
});

// POST /api/orders/sync-old - Sync all old tracked orders from Yalidine
router.post('/sync-old', async (req, res) => {
  try {
    const stats = await orderService.syncOldOrdersStatuses();
    success(res, stats);
  } catch (err) {
    error(res, err.message, 400);
  }
});

// DELETE /api/orders/:id - Delete order (restores stock only if approved)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await orderService.getById(parseInt(req.params.id));
    if (!existing) return error(res, 'الطلب غير موجود', 404);

    await orderService.delete(parseInt(req.params.id));
    success(res, { message: 'تم حذف الطلب بنجاح' });
  } catch (err) {
    error(res, err.message);
  }
});

module.exports = router;
