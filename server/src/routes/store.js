const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const orderService = require('../services/orderService');
const storeApiKey = require('../middleware/storeApiKey');
const { success, error } = require('../utils/response');
const metaCapi = require('../services/metaCapi');

async function fetchVariants(productId) {
  const variantsResult = await db.execute({
    sql: 'SELECT id, color, size, quantity, image FROM product_variants WHERE product_id = ? ORDER BY color, size',
    args: [productId],
  });
  return variantsResult.rows;
}

function mapProduct(row, variants) {
  const totalStock = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
  return {
    id: row.id,
    model_name: row.model_name,
    category: row.category,
    selling_price: row.selling_price,
    promotion_price: row.promotion_price ?? null,
    image: row.image,
    total_stock: totalStock,
    variants,
  };
}

// GET /api/store/products - public catalog
router.get('/products', async (req, res) => {
  try {
    const productsResult = await db.execute({
      sql: 'SELECT * FROM products ORDER BY created_at DESC',
    });

    const products = [];
    for (const row of productsResult.rows) {
      const variants = await fetchVariants(row.id);
      products.push(mapProduct(row, variants));
    }

    success(res, products);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/store/products/:id - public product detail
router.get('/products/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const productResult = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [productId],
    });
    if (productResult.rows.length === 0) return error(res, 'Product not found', 404);

    const row = productResult.rows[0];
    const variants = await fetchVariants(productId);
    success(res, mapProduct(row, variants));
  } catch (err) {
    error(res, err.message);
  }
});

// POST /api/store/checkout - protected order creation
router.post('/checkout', storeApiKey, async (req, res) => {
  try {
    const { customer, items } = req.body || {};
    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return error(res, 'Invalid checkout payload', 400);
    }

    const requiredFields = ['name', 'phone', 'wilaya', 'commune', 'address'];
    const missing = requiredFields.filter((field) => !String(customer[field] || '').trim());
    if (missing.length > 0) {
      return error(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }

    if (customer.deliveryMethod === 'stopdesk' && !String(customer.centerId || '').trim()) {
      return error(res, 'Missing required fields: centerId', 400);
    }

    const fullName = (customer.name || '').trim();
    const nameParts = fullName.split(' ').filter(Boolean);
    const firstname = nameParts[0] || fullName || null;
    const familyname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstname;

    const deliveryPrice = customer.deliveryPrice != null ? Number(customer.deliveryPrice) : 0;
    const itemsTotal = items.reduce(
      (sum, item) => sum + Number(item.selling_price || 0) * Number(item.quantity || 0),
      0
    );
    const orderTotal = itemsTotal + deliveryPrice;

    const orderInput = {
      notes: customer.notes || null,
      firstname,
      familyname,
      contact_phone: customer.phone || null,
      address: customer.address || null,
      to_wilaya_name: customer.wilaya || null,
      to_commune_name: customer.commune || null,
      is_stopdesk: customer.deliveryMethod === 'stopdesk',
      yalidine_price: orderTotal,
      delivery_price: deliveryPrice,
      items: items.map((item) => ({
        product_id: Number(item.product_id),
        variant_id: Number(item.variant_id),
        quantity: Number(item.quantity),
        selling_price: item.selling_price != null ? Number(item.selling_price) : undefined,
      })),
    };

    const order = await orderService.create(orderInput);

    const eventId = customer.eventId || `purchase-${order.order_number}`;
    const eventSourceUrl = req.get('origin') || req.get('referer') || '';
    const userData = metaCapi.buildUserData({
      firstname,
      familyname,
      phone: customer.phone,
      wilaya: customer.wilaya,
      commune: customer.commune,
    });

    metaCapi.sendEvent({
      eventName: 'Purchase',
      eventTime: Math.floor(Date.now() / 1000),
      eventId,
      user: userData,
      customData: {
        currency: 'DZD',
        value: Number(order.total_amount || 0) + deliveryPrice,
        order_id: order.order_number,
        contents: order.items.map((item) => ({
          id: item.product_id,
          quantity: item.quantity,
          item_price: item.selling_price,
        })),
      },
      eventSourceUrl,
      clientIp: req.ip,
      userAgent: req.get('user-agent') || '',
    }).catch((err) => {
      console.error('Meta CAPI error:', err.message);
    });

    success(res, {
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (err) {
    error(res, err.message, 400);
  }
});

module.exports = router;
