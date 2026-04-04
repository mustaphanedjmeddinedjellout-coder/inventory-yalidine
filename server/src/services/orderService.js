/**
 * Order Service
 * Handles order creation with stock deduction on admin approval and price snapshots (async for Turso).
 */

const { db } = require('../db/connection');
const { calculateLineItem, calculateOrderTotals, generateOrderNumber } = require('../utils/calculations');
const yalidineService = require('./yalidineService');

function extractYalidineStatus(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const candidates = [
    payload.state,
    payload.status,
    payload.last_status,
    payload.last_state,
    payload.current_status,
    payload.current_state,
    payload?.data?.state,
    payload?.data?.status,
    payload?.data?.last_status,
    payload?.data?.last_state,
    payload?.data?.current_status,
    payload?.data?.current_state,
    payload?.data?.last_status?.name,
    payload?.data?.last_state?.name,
    payload?.data?.current_status?.name,
    payload?.data?.current_state?.name,
    Array.isArray(payload?.history) ? payload.history[0]?.status : null,
    Array.isArray(payload?.history) ? payload.history[0]?.state : null,
    Array.isArray(payload?.history) ? payload.history[0]?.label : null,
    Array.isArray(payload?.data?.history) ? payload.data.history[0]?.status : null,
    Array.isArray(payload?.data?.history) ? payload.data.history[0]?.state : null,
    Array.isArray(payload?.data?.history) ? payload.data.history[0]?.label : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function getPhoneTail(value) {
  const digits = normalizePhone(value);
  if (!digits) return '';
  return digits.slice(-9);
}

function getPhoneCandidates(value) {
  const digits = normalizePhone(value);
  if (!digits) return [];

  const set = new Set([digits]);
  if (digits.startsWith('0') && digits.length >= 10) {
    set.add(`213${digits.slice(1)}`);
    set.add(`+213${digits.slice(1)}`);
  }
  if (digits.startsWith('213') && digits.length >= 12) {
    set.add(`0${digits.slice(3)}`);
    set.add(`+${digits}`);
  }

  return Array.from(set);
}

function extractParcelTracking(parcel) {
  const candidates = [
    parcel?.tracking,
    parcel?.tracking_number,
    parcel?.tracking_num,
    parcel?.barcode,
    parcel?.parcel_tracking,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

function extractParcelPhone(parcel) {
  const candidates = [
    parcel?.contact_phone,
    parcel?.phone,
    parcel?.mobile,
    parcel?.customer_phone,
    parcel?.receiver_phone,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

function extractParcelOrderId(parcel) {
  const candidates = [
    parcel?.order_id,
    parcel?.orderId,
    parcel?.id_order,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const val = String(candidate).trim();
    if (val) return val;
  }
  return null;
}

function extractParcelLabel(parcel) {
  const candidates = [
    parcel?.label,
    parcel?.status_label,
    parcel?.state,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

function parcelTimestamp(parcel) {
  const candidates = [
    parcel?.updated_at,
    parcel?.created_at,
    parcel?.updatedAt,
    parcel?.createdAt,
    parcel?.date_creation,
  ];
  for (const candidate of candidates) {
    const t = new Date(candidate || '').getTime();
    if (!Number.isNaN(t) && t > 0) return t;
  }
  return 0;
}

const orderService = {
  /**
   * Get all orders with optional date filtering
   */
  async getAll(filters = {}, options = {}) {
    let query = "SELECT * FROM orders WHERE 1=1";
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
    const rows = result.rows;

    if (options.syncYalidine && yalidineService.isConfigured()) {
      await Promise.all(rows.map(async (order) => {
        if (!order.yalidine_tracking) return;

        try {
          const trackingPayload = await yalidineService.getTracking(order.yalidine_tracking);
          const latestStatus = extractYalidineStatus(trackingPayload);
          if (!latestStatus || latestStatus === order.yalidine_status) return;

          await db.execute({
            sql: 'UPDATE orders SET yalidine_status = ? WHERE id = ?',
            args: [latestStatus, order.id],
          });
          order.yalidine_status = latestStatus;
        } catch (err) {
          console.warn(`Failed to sync Yalidine status for order ${order.id}:`, err.message);
        }
      }));
    }

    return rows;
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
   * Sync Yalidine status for a single order by id.
   */
  async syncYalidineStatus(id) {
    const order = await this.getById(id);
    if (!order) throw new Error('الطلب غير موجود');
    if (!order.yalidine_tracking) return order;
    if (!yalidineService.isConfigured()) {
      throw new Error('Yalidine غير مفعّل. يرجى ضبط مفاتيح API.');
    }

    const trackingPayload = await yalidineService.getTracking(order.yalidine_tracking);
    const latestStatus = extractYalidineStatus(trackingPayload);

    if (latestStatus && latestStatus !== order.yalidine_status) {
      await db.execute({
        sql: 'UPDATE orders SET yalidine_status = ? WHERE id = ?',
        args: [latestStatus, id],
      });
    }

    return this.getById(id);
  },

  /**
   * Sync Yalidine statuses for all existing tracked orders.
   */
  async syncOldOrdersStatuses() {
    if (!yalidineService.isConfigured()) {
      throw new Error('Yalidine غير مفعّل. يرجى ضبط مفاتيح API.');
    }

    const result = await db.execute({
      sql: `SELECT id, yalidine_tracking, yalidine_status
            FROM orders
            WHERE yalidine_tracking IS NOT NULL
              AND trim(yalidine_tracking) != ''
            ORDER BY created_at ASC`,
    });

    let synced = 0;
    let updated = 0;
    let failed = 0;

    await Promise.all(result.rows.map(async (order) => {
      try {
        const trackingPayload = await yalidineService.getTracking(order.yalidine_tracking);
        const latestStatus = extractYalidineStatus(trackingPayload);
        synced += 1;

        if (latestStatus && latestStatus !== order.yalidine_status) {
          await db.execute({
            sql: 'UPDATE orders SET yalidine_status = ? WHERE id = ?',
            args: [latestStatus, order.id],
          });
          updated += 1;
        }
      } catch (err) {
        failed += 1;
        console.warn(`Failed to sync old order ${order.id}:`, err.message);
      }
    }));

    return {
      totalTracked: result.rows.length,
      synced,
      updated,
      failed,
    };
  },

  /**
   * Sync old admin orders from Yalidine account by phone number.
   * If phone is provided, only orders with that phone are processed.
   */
  async syncOrdersFromYalidineByPhone(phone) {
    if (!yalidineService.isConfigured()) {
      throw new Error('Yalidine غير مفعّل. يرجى ضبط مفاتيح API.');
    }

    const phoneFilter = String(phone || '').trim();
    const where = ["contact_phone IS NOT NULL", "trim(contact_phone) != ''"];
    const args = [];

    if (phoneFilter) {
      where.push("replace(replace(replace(contact_phone, '+', ''), ' ', ''), '-', '') LIKE ?");
      args.push(`%${normalizePhone(phoneFilter)}%`);
    }

    const ordersResult = await db.execute({
      sql: `SELECT id, order_number, contact_phone, yalidine_tracking, yalidine_status, yalidine_label
            FROM orders
            WHERE ${where.join(' AND ')}
            ORDER BY created_at ASC`,
      args,
    });

    const orders = ordersResult.rows;
    const parcelsByPhoneTail = new Map();

    let matched = 0;
    let updated = 0;
    let failed = 0;
    let noMatch = 0;

    for (const order of orders) {
      const tail = getPhoneTail(order.contact_phone);
      if (!tail) {
        noMatch += 1;
        continue;
      }

      if (!parcelsByPhoneTail.has(tail)) {
        const parcels = [];
        const candidates = getPhoneCandidates(order.contact_phone);
        for (const candidate of candidates) {
          try {
            const rows = await yalidineService.getAllParcelsByPhone(candidate, { maxPages: 5, pageSize: 100 });
            if (rows.length > 0) {
              parcels.push(...rows);
              break;
            }
          } catch {
            // Try next phone format candidate.
          }
        }
        parcelsByPhoneTail.set(tail, parcels);
      }

      try {
        const pool = parcelsByPhoneTail.get(tail) || [];
        const samePhone = pool.filter((parcel) => getPhoneTail(extractParcelPhone(parcel)) === tail);

        if (samePhone.length === 0) {
          noMatch += 1;
          continue;
        }

        const byOrderId = samePhone.find((parcel) => extractParcelOrderId(parcel) === String(order.order_number || '').trim());
        const byTracking = order.yalidine_tracking
          ? samePhone.find((parcel) => extractParcelTracking(parcel) === String(order.yalidine_tracking).trim())
          : null;

        const best = byOrderId
          || byTracking
          || samePhone.slice().sort((a, b) => parcelTimestamp(b) - parcelTimestamp(a))[0];

        if (!best) {
          noMatch += 1;
          continue;
        }

        matched += 1;

        const nextTracking = extractParcelTracking(best) || order.yalidine_tracking || null;
        const nextStatus = extractYalidineStatus(best) || order.yalidine_status || null;
        const nextLabel = extractParcelLabel(best) || order.yalidine_label || null;

        if (
          String(nextTracking || '') !== String(order.yalidine_tracking || '')
          || String(nextStatus || '') !== String(order.yalidine_status || '')
          || String(nextLabel || '') !== String(order.yalidine_label || '')
        ) {
          await db.execute({
            sql: `UPDATE orders
                  SET yalidine_tracking = ?, yalidine_status = ?, yalidine_label = ?
                  WHERE id = ?`,
            args: [nextTracking, nextStatus, nextLabel, order.id],
          });
          updated += 1;
        }
      } catch (err) {
        failed += 1;
        console.warn(`Failed phone-sync for order ${order.id}:`, err.message);
      }
    }

    return {
      totalOrders: orders.length,
      matched,
      updated,
      noMatch,
      failed,
      phoneFilter: phoneFilter || null,
    };
  },

  /**
   * Create an order with line items.
   */
  async create(data) {
    const { notes, firstname, familyname, contact_phone, address, to_wilaya_name, to_commune_name, is_stopdesk, yalidine_price, items, approve, delivery_price } = data;

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

    }

    const { totalAmount, totalCost, totalProfit, itemsCount } = calculateOrderTotals(processedItems);
    const deliveryPrice = Number(delivery_price || 0);
    const totalWithDelivery = totalAmount + deliveryPrice;

    const orderResult = await db.execute({
      sql: `INSERT INTO orders (order_number, order_status, total_amount, total_cost, total_profit, items_count, delivery_price, notes,
         firstname, familyname, contact_phone, address, to_wilaya_name, to_commune_name, is_stopdesk, yalidine_price)
         VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        orderNumber, totalWithDelivery, totalCost, totalProfit, itemsCount, deliveryPrice, notes || null,
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

    if (approve) {
      return this.approve(newOrderId);
    }

    return this.getById(newOrderId);
  },

  /**
   * Approve order and send to Yalidine.
   */
  async approve(id) {
    const order = await this.getById(id);
    if (!order) throw new Error('الطلب غير موجود');

    if (order.order_status === 'approved' || order.yalidine_tracking) {
      return order;
    }

    const normalized = {
      firstname: String(order.firstname || '').trim(),
      familyname: String(order.familyname || '').trim() || String(order.firstname || '').trim(),
      contact_phone: String(order.contact_phone || '').trim(),
      address: String(order.address || '').trim(),
      to_wilaya_name: String(order.to_wilaya_name || '').trim(),
      to_commune_name: String(order.to_commune_name || '').trim(),
    };

    if (!normalized.firstname || !normalized.familyname || !normalized.contact_phone || !normalized.address || !normalized.to_wilaya_name || !normalized.to_commune_name) {
      throw new Error('بيانات الشحن ناقصة ولا يمكن إرسال الطلب إلى يالدين');
    }

    if (!yalidineService.isConfigured()) {
      throw new Error('Yalidine غير مفعّل. يرجى ضبط مفاتيح API.');
    }

    if (normalized.familyname !== (order.familyname || '')) {
      await db.execute({
        sql: `UPDATE orders SET familyname = ? WHERE id = ?`,
        args: [normalized.familyname, id],
      });
    }

    // Deduct stock only at approval time
    for (const item of order.items) {
      const variantResult = await db.execute({
        sql: 'SELECT quantity FROM product_variants WHERE id = ?',
        args: [item.variant_id],
      });

      if (variantResult.rows.length === 0) {
        throw new Error(`المتغير غير موجود: ${item.variant_id}`);
      }

      const available = Number(variantResult.rows[0].quantity || 0);
      const requested = Number(item.quantity || 0);
      if (available < requested) {
        throw new Error(`الكمية غير كافية لتأكيد الطلب (المتوفر: ${available})`);
      }
    }

    for (const item of order.items) {
      await db.execute({
        sql: `UPDATE product_variants SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?`,
        args: [item.quantity, item.variant_id],
      });
    }

    const productList = order.items.map(i => `${i.product_name} (${i.variant_info}) x${i.quantity}`).join(', ') + ' - يسمح بالفتح';
    const result = await yalidineService.createParcel({ ...order, ...normalized }, productList);

    if (result && Array.isArray(result) && result.length > 0) {
      const parcel = result[0];
      await db.execute({
        sql: `UPDATE orders SET order_status = 'approved', yalidine_tracking = ?, yalidine_status = ?, yalidine_label = ? WHERE id = ?`,
        args: [parcel.tracking || null, parcel.state || parcel.status || 'En preparation', parcel.label || null, id],
      });
    } else {
      await db.execute({
        sql: `UPDATE orders SET order_status = 'approved', yalidine_status = 'En preparation' WHERE id = ?`,
        args: [id],
      });
    }

    return this.getById(id);
  },

  /**
   * Delete an order (restores stock)
   */
  async delete(id) {
    const orderResult = await db.execute({ sql: 'SELECT order_status FROM orders WHERE id = ?', args: [id] });
    if (orderResult.rows.length === 0) {
      throw new Error('الطلب غير موجود');
    }

    const isApproved = String(orderResult.rows[0].order_status || '') === 'approved';

    if (isApproved) {
      const itemsResult = await db.execute({ sql: 'SELECT * FROM order_items WHERE order_id = ?', args: [id] });

      for (const item of itemsResult.rows) {
        await db.execute({
          sql: `UPDATE product_variants SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`,
          args: [item.quantity, item.variant_id],
        });
      }
    }

    await db.execute({ sql: 'DELETE FROM order_items WHERE order_id = ?', args: [id] });
    return db.execute({ sql: 'DELETE FROM orders WHERE id = ?', args: [id] });
  },
};

module.exports = orderService;
