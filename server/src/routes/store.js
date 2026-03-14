/**
 * Store-facing API routes.
 * These endpoints are consumed by the storefront (Noire).
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const { success, error } = require('../utils/response');
const productService = require('../services/productService');
const { calculateLineItem, calculateOrderTotals, generateOrderNumber } = require('../utils/calculations');
const { requireStoreApiKey } = require('../middleware/storeApiKey');

router.use(requireStoreApiKey);

function normalizeStoreProduct(product) {
  const variants = (product.variants || []).map((variant) => ({
    id: Number(variant.id),
    color: variant.color,
    size: variant.size,
    quantity: Number(variant.quantity || 0),
  }));

  const totalStock = variants.reduce((sum, variant) => sum + variant.quantity, 0);

  return {
    id: Number(product.id),
    model_name: product.model_name,
    category: product.category,
    selling_price: Number(product.selling_price),
    image: product.image || null,
    total_stock: Number(product.total_stock ?? totalStock),
    variants,
  };
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function validateCheckoutPayload(body) {
  const customer = body && typeof body.customer === 'object' ? body.customer : null;
  const items = Array.isArray(body?.items) ? body.items : null;

  if (!customer) {
    return 'Customer data is required.';
  }
  if (!items || items.length === 0) {
    return 'At least one item is required.';
  }

  const requiredCustomerFields = ['name', 'phone', 'wilaya', 'commune', 'address', 'deliveryMethod'];
  for (const field of requiredCustomerFields) {
    const value = customer[field];
    if (typeof value !== 'string' || !value.trim()) {
      return `Invalid customer.${field}`;
    }
  }

  if (!['home', 'stopdesk'].includes(customer.deliveryMethod)) {
    return 'Invalid customer.deliveryMethod. Allowed values: home, stopdesk';
  }

  for (const item of items) {
    const productId = parsePositiveInt(item?.product_id);
    const variantId = parsePositiveInt(item?.variant_id);
    const quantity = parsePositiveInt(item?.quantity);

    if (!productId || !variantId || !quantity) {
      return 'Each item must include valid product_id, variant_id, and quantity.';
    }

    if (item.selling_price != null && !Number.isFinite(Number(item.selling_price))) {
      return 'Invalid item.selling_price';
    }
  }

  return null;
}

// GET /api/store/products
router.get('/products', async (req, res) => {
  try {
    const products = await productService.getAll();
    const normalized = products.map(normalizeStoreProduct);
    return success(res, normalized);
  } catch (err) {
    return error(res, err.message);
  }
});

// GET /api/store/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return error(res, 'Invalid product id', 400);

    const product = await productService.getById(id);
    if (!product) return error(res, 'Product not found', 404);

    return success(res, normalizeStoreProduct(product));
  } catch (err) {
    return error(res, err.message);
  }
});

// POST /api/store/checkout
router.post('/checkout', async (req, res) => {
  const validationError = validateCheckoutPayload(req.body);
  if (validationError) {
    return error(res, validationError, 400);
  }

  const customer = req.body.customer;
  const items = req.body.items;

  const processedItems = [];
  const orderNumber = generateOrderNumber();
  let transactionStarted = false;

  try {
    await db.execute({ sql: 'BEGIN IMMEDIATE' });
    transactionStarted = true;

    for (const item of items) {
      const productId = parsePositiveInt(item.product_id);
      const variantId = parsePositiveInt(item.variant_id);
      const quantity = parsePositiveInt(item.quantity);

      const productResult = await db.execute({
        sql: 'SELECT id, model_name, selling_price, cost_price FROM products WHERE id = ?',
        args: [productId],
      });

      if (!productResult.rows.length) {
        throw new Error(`Product not found: ${productId}`);
      }

      const product = productResult.rows[0];
      const variantResult = await db.execute({
        sql: 'SELECT id, product_id, color, size, quantity FROM product_variants WHERE id = ? AND product_id = ?',
        args: [variantId, productId],
      });

      if (!variantResult.rows.length) {
        throw new Error(`Variant not found: ${variantId}`);
      }

      const variant = variantResult.rows[0];
      if (Number(variant.quantity) < quantity) {
        throw new Error(
          `Out of stock for ${product.model_name} (${variant.color} / ${variant.size}). Available: ${variant.quantity}`
        );
      }

      const stockUpdate = await db.execute({
        sql: "UPDATE product_variants SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ? AND product_id = ? AND quantity >= ?",
        args: [quantity, variantId, productId, quantity],
      });

      if (Number(stockUpdate.rowsAffected || 0) === 0) {
        throw new Error(
          `Out of stock for ${product.model_name} (${variant.color} / ${variant.size}). Please refresh and try again.`
        );
      }

      const sellingPrice =
        item.selling_price != null ? Number(item.selling_price) : Number(product.selling_price);
      const costPrice = Number(product.cost_price);

      const { lineTotal, lineCost, lineProfit } = calculateLineItem(quantity, sellingPrice, costPrice);

      processedItems.push({
        product_id: Number(product.id),
        variant_id: Number(variant.id),
        product_name: product.model_name,
        variant_info: `${variant.color} / ${variant.size}`,
        quantity,
        selling_price: sellingPrice,
        cost_price: costPrice,
        lineTotal,
        lineCost,
        lineProfit,
      });
    }

    const { totalAmount, totalCost, totalProfit, itemsCount } = calculateOrderTotals(processedItems);

    const nameParts = String(customer.name).trim().split(/\s+/).filter(Boolean);
    const firstname = nameParts.shift() || customer.name;
    const familyname = nameParts.join(' ') || null;

    const orderInsert = await db.execute({
      sql: `INSERT INTO orders (
        order_number,
        total_amount,
        total_cost,
        total_profit,
        items_count,
        notes,
        firstname,
        familyname,
        contact_phone,
        address,
        to_wilaya_name,
        to_commune_name,
        is_stopdesk,
        yalidine_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        orderNumber,
        totalAmount,
        totalCost,
        totalProfit,
        itemsCount,
        customer.notes ? String(customer.notes) : null,
        firstname,
        familyname,
        String(customer.phone),
        String(customer.address),
        String(customer.wilaya),
        String(customer.commune),
        customer.deliveryMethod === 'stopdesk' ? 1 : 0,
        null,
      ],
    });

    const orderId = Number(orderInsert.lastInsertRowid);

    for (const item of processedItems) {
      await db.execute({
        sql: `INSERT INTO order_items (
          order_id,
          product_id,
          variant_id,
          product_name,
          variant_info,
          quantity,
          selling_price,
          cost_price,
          line_total,
          line_cost,
          line_profit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          orderId,
          item.product_id,
          item.variant_id,
          item.product_name,
          item.variant_info,
          item.quantity,
          item.selling_price,
          item.cost_price,
          item.lineTotal,
          item.lineCost,
          item.lineProfit,
        ],
      });
    }

    await db.execute({ sql: 'COMMIT' });

    return success(
      res,
      {
        orderId,
        orderNumber,
      },
      201
    );
  } catch (err) {
    if (transactionStarted) {
      try {
        await db.execute({ sql: 'ROLLBACK' });
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }

    const msg = err && err.message ? err.message : 'Checkout failed';
    const isStockError = /out of stock|available/i.test(msg);
    return error(res, msg, isStockError ? 400 : 500);
  }
});

module.exports = router;
