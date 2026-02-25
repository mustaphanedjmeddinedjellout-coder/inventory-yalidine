/**
 * Order Service
 * Handles order creation with stock reduction and price snapshots.
 */

const db = require('../db/connection');
const { calculateLineItem, calculateOrderTotals, generateOrderNumber } = require('../utils/calculations');
const yalidineService = require('./yalidineService');

const orderService = {
  /**
   * Get all orders with optional date filtering
   */
  getAll(filters = {}) {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (filters.date) {
      query += " AND date(created_at) = date(?)";
      params.push(filters.date);
    }
    if (filters.from) {
      query += " AND date(created_at) >= date(?)";
      params.push(filters.from);
    }
    if (filters.to) {
      query += " AND date(created_at) <= date(?)";
      params.push(filters.to);
    }

    query += ' ORDER BY created_at DESC';
    return db.prepare(query).all(...params);
  },

  /**
   * Get a single order with its items
   */
  getById(id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return null;

    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return order;
  },

  /**
   * Create an order with line items.
   * - Snapshots selling_price and cost_price at time of sale
   * - Reduces stock for each variant
   * - Calculates totals and profit automatically
   * - Sends parcel to Yalidine if customer info is provided
   *
   * @param {Object} data - { notes, firstname, familyname, contact_phone, address, to_wilaya_name, to_commune_name, is_stopdesk, items: [{ product_id, variant_id, quantity }] }
   */
  create(data) {
    const { notes, firstname, familyname, contact_phone, address, to_wilaya_name, to_commune_name, is_stopdesk, yalidine_price, items } = data;

    if (!items || items.length === 0) {
      throw new Error('يجب إضافة عنصر واحد على الأقل للطلب'); // Must add at least one item
    }

    const orderId = db.transaction(() => {
      const orderNumber = generateOrderNumber();
      const processedItems = [];

      for (const item of items) {
        // Fetch current product info for price snapshots
        const product = db.prepare('SELECT id, model_name, selling_price, cost_price FROM products WHERE id = ?').get(item.product_id);
        if (!product) {
          throw new Error(`المنتج غير موجود: ${item.product_id}`);
        }

        // Fetch variant for stock check
        const variant = db.prepare('SELECT * FROM product_variants WHERE id = ? AND product_id = ?').get(item.variant_id, item.product_id);
        if (!variant) {
          throw new Error(`المتغير غير موجود: ${item.variant_id}`);
        }

        if (variant.quantity < item.quantity) {
          throw new Error(`الكمية غير كافية لـ ${product.model_name} (${variant.color} / ${variant.size}). المتاح: ${variant.quantity}`);
        }

        // Use custom prices if provided, otherwise snapshot from product
        const sellingPrice = item.selling_price != null ? item.selling_price : product.selling_price;
        const costPrice = item.cost_price != null ? item.cost_price : product.cost_price;

        // Calculate line item
        const { lineTotal, lineCost, lineProfit } = calculateLineItem(
          item.quantity,
          sellingPrice,
          costPrice
        );

        processedItems.push({
          product_id: product.id,
          variant_id: variant.id,
          product_name: product.model_name,
          variant_info: `${variant.color} / ${variant.size}`,
          quantity: item.quantity,
          selling_price: sellingPrice,
          cost_price: costPrice,
          lineTotal,
          lineCost,
          lineProfit,
        });

        // Reduce stock
        db.prepare(
          `UPDATE product_variants SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?`
        ).run(item.quantity, variant.id);
      }

      // Calculate order totals
      const { totalAmount, totalCost, totalProfit, itemsCount } = calculateOrderTotals(processedItems);

      // Insert order
      const orderResult = db.prepare(
        `INSERT INTO orders (order_number, total_amount, total_cost, total_profit, items_count, notes,
         firstname, familyname, contact_phone, address, to_wilaya_name, to_commune_name, is_stopdesk, yalidine_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        orderNumber, totalAmount, totalCost, totalProfit, itemsCount, notes || null,
        firstname || null, familyname || null, contact_phone || null, address || null,
        to_wilaya_name || null, to_commune_name || null, is_stopdesk ? 1 : 0,
        yalidine_price != null ? yalidine_price : null
      );

      const newOrderId = orderResult.lastInsertRowid;

      // Insert order items with price snapshots
      const itemStmt = db.prepare(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_info, quantity, selling_price, cost_price, line_total, line_cost, line_profit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const pi of processedItems) {
        itemStmt.run(
          newOrderId,
          pi.product_id,
          pi.variant_id,
          pi.product_name,
          pi.variant_info,
          pi.quantity,
          pi.selling_price,
          pi.cost_price,
          pi.lineTotal,
          pi.lineCost,
          pi.lineProfit
        );
      }

      return newOrderId;
    })();

    const order = this.getById(orderId);

    // Auto-send to Yalidine if customer shipping info is complete and API is configured
    if (order && firstname && familyname && contact_phone && address && to_wilaya_name && to_commune_name) {
      if (yalidineService.isConfigured()) {
        // Build product list description from order items
        const productList = order.items.map(i => `${i.product_name} (${i.variant_info}) x${i.quantity}`).join(', ');

        yalidineService.createParcel(order, productList)
          .then((result) => {
            // Save tracking info if available
            if (result && Array.isArray(result) && result.length > 0) {
              const parcel = result[0];
              if (parcel.tracking) {
                db.prepare(
                  `UPDATE orders SET yalidine_tracking = ?, yalidine_status = ?, yalidine_label = ? WHERE id = ?`
                ).run(parcel.tracking, parcel.state || 'submitted', parcel.label || null, orderId);
              }
            }
          })
          .catch((err) => {
            console.error('Yalidine parcel creation failed:', err.message);
            // Order is still created – Yalidine push is best-effort
          });
      }
    }

    return order;
  },

  /**
   * Delete an order (restores stock)
   */
  delete(id) {
    return db.transaction(() => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);

      // Restore stock for each item
      for (const item of items) {
        db.prepare(
          `UPDATE product_variants SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`
        ).run(item.quantity, item.variant_id);
      }

      return db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    })();
  },
};

module.exports = orderService;
