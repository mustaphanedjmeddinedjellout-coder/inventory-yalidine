/**
 * Order Service
 * Handles order creation with stock reduction and price snapshots (async for Turso).
 */

const { db } = require('../db/connection');
const { calculateLineItem, calculateOrderTotals, generateOrderNumber } = require('../utils/calculations');
const yalidineService = require('./yalidineService');

const orderService = {
  /**
   * Get all orders with optional date filtering
   */
  async getAll(filters = {}) {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const args = [];

    if (filters.date) {
      query += " AND date(created_at) = date(?)";
      args.push(filters.date);
    }
    if (filters.from) {
      query += " AND date(created_at) >= date(?)";
      args.push(filters.from);
    }
    if (filters.to) {
      query += " AND date(created_at) <= date(?)";
      args.push(filters.to);
    }

    query += ' ORDER BY created_at DESC';
    const result = await db.execute({ sql: query, args });
    return result.rows;
  },

  /**
   * Get a single order with its items
   */
  async getById(id) {
    const result = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return null;

    const order = { ...result.rows[0] };
    const itemsResult = await db.execute({ sql: 'SELECT * FROM order_items WHERE order_id = ?', args: [id] });
    order.items = itemsResult.rows;
    return order;
  },

  /**
   * Create an order with line items.
   */
  async create(data) {
    const { notes, firstname, familyname, contact_phone, address, to_wilaya_name, to_commune_name, is_stopdesk, yalidine_price, items } = data;

    if (!items || items.length === 0) {
      throw new Error('يجب إضافة عنصر واحد على الأقل للطلب');
    }

    const orderNumber = generateOrderNumber();
    const processedItems = [];

    for (const item of items) {
      const productResult = await db.execute({
        sql: 'SELECT id, model_name, selling_price, cost_price FROM products WHERE id = ?',
        args: [item.product_id],
      });
      if (productResult.rows.length === 0) {
        throw new Error(`المنتج غير موجود: ${item.product_id}`);
      }
      const product = productResult.rows[0];

      const variantResult = await db.execute({
        sql: 'SELECT * FROM product_variants WHERE id = ? AND product_id = ?',
        args: [item.variant_id, item.product_id],
      });
      if (variantResult.rows.length === 0) {
        throw new Error(`المتغير غير موجود: ${item.variant_id}`);
      }
      const variant = variantResult.rows[0];

      if (variant.quantity < item.quantity) {
        throw new Error(`الكمية غير كافية لـ ${product.model_name} (${variant.color} / ${variant.size}). المتاح: ${variant.quantity}`);
      }

      const sellingPrice = item.selling_price != null ? item.selling_price : product.selling_price;
      const costPrice = item.cost_price != null ? item.cost_price : product.cost_price;

      const { lineTotal, lineCost, lineProfit } = calculateLineItem(item.quantity, sellingPrice, costPrice);

      processedItems.push({
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.model_name,
        variant_info: `${variant.color} / ${variant.size}`,
        quantity: item.quantity,
        selling_price: sellingPrice,
        cost_price: costPrice,
        lineTotal, lineCost, lineProfit,
      });

      // Reduce stock
      await db.execute({
        sql: `UPDATE product_variants SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?`,
        args: [item.quantity, variant.id],
      });
    }

    const { totalAmount, totalCost, totalProfit, itemsCount } = calculateOrderTotals(processedItems);

    const orderResult = await db.execute({
      sql: `INSERT INTO orders (order_number, total_amount, total_cost, total_profit, items_count, notes,
         firstname, familyname, contact_phone, address, to_wilaya_name, to_commune_name, is_stopdesk, yalidine_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        orderNumber, totalAmount, totalCost, totalProfit, itemsCount, notes || null,
        firstname || null, familyname || null, contact_phone || null, address || null,
        to_wilaya_name || null, to_commune_name || null, is_stopdesk ? 1 : 0,
        yalidine_price != null ? yalidine_price : null,
      ],
    });

    const newOrderId = Number(orderResult.lastInsertRowid);

    for (const pi of processedItems) {
      await db.execute({
        sql: `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_info, quantity, selling_price, cost_price, line_total, line_cost, line_profit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [newOrderId, pi.product_id, pi.variant_id, pi.product_name, pi.variant_info, pi.quantity, pi.selling_price, pi.cost_price, pi.lineTotal, pi.lineCost, pi.lineProfit],
      });
    }

    const order = await this.getById(newOrderId);

    // Auto-send to Yalidine
    if (order && firstname && familyname && contact_phone && address && to_wilaya_name && to_commune_name) {
      if (yalidineService.isConfigured()) {
        const productList = order.items.map(i => `${i.product_name} (${i.variant_info}) x${i.quantity}`).join(', ');

        yalidineService.createParcel(order, productList)
          .then(async (result) => {
            if (result && Array.isArray(result) && result.length > 0) {
              const parcel = result[0];
              if (parcel.tracking) {
                await db.execute({
                  sql: `UPDATE orders SET yalidine_tracking = ?, yalidine_status = ?, yalidine_label = ? WHERE id = ?`,
                  args: [parcel.tracking, parcel.state || 'submitted', parcel.label || null, newOrderId],
                });
              }
            }
          })
          .catch((err) => {
            console.error('Yalidine parcel creation failed:', err.message);
          });
      }
    }

    return order;
  },

  /**
   * Delete an order (restores stock)
   */
  async delete(id) {
    const itemsResult = await db.execute({ sql: 'SELECT * FROM order_items WHERE order_id = ?', args: [id] });

    for (const item of itemsResult.rows) {
      await db.execute({
        sql: `UPDATE product_variants SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`,
        args: [item.quantity, item.variant_id],
      });
    }

    await db.execute({ sql: 'DELETE FROM order_items WHERE order_id = ?', args: [id] });
    return db.execute({ sql: 'DELETE FROM orders WHERE id = ?', args: [id] });
  },
};

module.exports = orderService;
