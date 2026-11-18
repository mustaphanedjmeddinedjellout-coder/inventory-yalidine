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
    const shouldSyncYalidine = req.query.sync === '1';
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

// GET /api/orders/:id/tracking-history - Get Yalidine status timeline for an order
router.get('/:id/tracking-history', async (req, res) => {
  try {
    const result = await orderService.getYalidineHistory(parseInt(req.params.id));
    success(res, result);
  } catch (err) {
    error(res, err.message, 400);
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

    // Fire a separate "ConfirmedOrder" event once the order is confirmed by phone.
    // It is NOT a "Purchase" (that was already counted at checkout), so Meta reports
    // aren't inflated. In Events Manager, create a custom conversion on it to see
    // cost per confirmed order, or to optimize campaigns for confirmed buyers.
    let tracking = {};
    try {
      tracking = order.meta_tracking ? JSON.parse(order.meta_tracking) : {};
    } catch {
      tracking = {};
    }
    const orderNumber = String(order.order_number || order.id);
    const userData = metaCapi.buildUserData({
      firstname: order.firstname,
      familyname: order.familyname,
      phone: order.contact_phone,
      wilaya: order.to_wilaya_name,
      commune: order.to_commune_name,
    });

    metaCapi.sendEvent({
      eventName: 'ConfirmedOrder',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: `${orderNumber}-confirmed`,
      user: userData,
      customData: {
        currency: 'DZD',
        value: Number(order.total_amount || order.yalidine_price || 0),
        order_id: orderNumber,
        content_type: 'product',
        content_ids: (order.items || []).map((item) => String(item.product_id)),
        contents: (order.items || []).map((item) => ({
          id: String(item.product_id),
          quantity: item.quantity,
          item_price: item.selling_price,
        })),
      },
      // Use the customer's original browser data, not the admin's.
      eventSourceUrl: tracking.source_url || req.get('origin') || '',
      clientIp: tracking.ip || undefined,
      userAgent: tracking.user_agent || req.get('user-agent') || '',
      fbp: tracking.fbp,
      fbc: tracking.fbc,
    }).catch((err) => {
      console.error('Meta CAPI (ConfirmedOrder) error:', err.message);
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
    const stats = await orderService.runFullSync();
    success(res, stats);
  } catch (err) {
    error(res, err.message, 400);
  }
});

// POST /api/orders/sync-by-phone - Sync old admin orders from Yalidine by phone
router.post('/sync-by-phone', async (req, res) => {
  try {
    const stats = await orderService.runPhoneSync(req.body?.phone);
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
