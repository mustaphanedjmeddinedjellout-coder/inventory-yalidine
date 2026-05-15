/**
 * Order Routes
 * Create, list, view, and delete orders.
 */

const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const metaCapi = require('../services/metaCapi');
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

    // Fire Meta CAPI Purchase event for the CONFIRMED order.
    // Uses a distinct event_id (-confirmed suffix) so it is NOT deduplicated
    // against the initial checkout Purchase event.
    const eventId = `${String(order.order_number || order.id)}-confirmed`;
    const userData = metaCapi.buildUserData({
      firstname: order.firstname,
      familyname: order.familyname,
      phone: order.contact_phone,
      wilaya: order.to_wilaya_name,
      commune: order.to_commune_name,
    });

    metaCapi.sendEvent({
      eventName: 'Purchase',
      eventTime: Math.floor(Date.now() / 1000),
      eventId,
      user: userData,
      customData: {
        currency: 'DZD',
        value: Number(order.total_amount || order.yalidine_price || 0),
        order_id: String(order.order_number || order.id),
        order_status: 'confirmed',
        contents: (order.items || []).map((item) => ({
          id: item.product_id,
          quantity: item.quantity,
          item_price: item.selling_price,
        })),
      },
      eventSourceUrl: req.get('origin') || req.get('referer') || '',
      clientIp: req.ip,
      userAgent: req.get('user-agent') || '',
    }).catch((err) => {
      console.error('Meta CAPI (confirmed Purchase) error:', err.message);
    });

    success(res, order);
  } catch (err) {
    error(res, err.message, 400);
  }
});

// POST /api/orders/:id/update - Update editable order fields
router.post('/:id/update', async (req, res) => {
  try {
    const order = await orderService.update(parseInt(req.params.id), req.body || {});
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

// POST /api/orders/sync-by-phone - Sync old admin orders from Yalidine by phone
router.post('/sync-by-phone', async (req, res) => {
  try {
    const stats = await orderService.syncOrdersFromYalidineByPhone(req.body?.phone);
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
