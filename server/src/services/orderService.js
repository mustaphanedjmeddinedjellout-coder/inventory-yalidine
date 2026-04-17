/**
 * Order Service
 * Handles order creation with stock deduction on admin approval and price snapshots (async for Turso).
 */

const { db } = require('../db/connection');
const { calculateLineItem, calculateOrderTotals, generateOrderNumber } = require('../utils/calculations');
const yalidineService = require('./yalidineService');
const whatsappService = require('./whatsappService');

function extractText(candidate) {
  if (candidate == null) return null;

  if (typeof candidate === 'string') {
    const value = candidate.trim();
    return value || null;
  }

  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return String(candidate);
  }

  if (typeof candidate !== 'object') return null;

  const nestedCandidates = [
    candidate.label,
    candidate.status_label,
    candidate.state_label,
    candidate.name,
    candidate.status,
    candidate.state,
    candidate.title,
    candidate.description,
    candidate.text,
    candidate.value,
    candidate.code,
    candidate.fr,
    candidate.en,
    candidate.ar,
  ];

  for (const nested of nestedCandidates) {
    const value = extractText(nested);
    if (value) return value;
  }

  return null;
}

function firstText(candidates = []) {
  for (const candidate of candidates) {
    const value = extractText(candidate);
    if (value) return value;
  }
  return null;
}

function unwrapYalidineEntity(payload) {
  if (!payload || typeof payload !== 'object') return null;

  if (Array.isArray(payload)) {
    return payload.find((entry) => entry && typeof entry === 'object') || null;
  }

  if (Array.isArray(payload.data)) {
    return payload.data.find((entry) => entry && typeof entry === 'object') || null;
  }

  if (payload.data && typeof payload.data === 'object') {
    return payload.data;
  }

  return payload;
}

function historyTimestamp(entry) {
  const directCandidates = [
    entry?.updated_at,
    entry?.created_at,
    entry?.updatedAt,
    entry?.createdAt,
    entry?.date_status,
    entry?.status_date,
    entry?.date_creation,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return candidate > 1e12 ? candidate : candidate * 1000;
    }

    const ts = new Date(candidate || '').getTime();
    if (!Number.isNaN(ts) && ts > 0) return ts;
  }

  return 0;
}

function getLatestHistoryEntry(payload) {
  const collections = [
    Array.isArray(payload?.history) ? payload.history : [],
    Array.isArray(payload?.data?.history) ? payload.data.history : [],
    Array.isArray(payload) ? payload : [],
    Array.isArray(payload?.data) ? payload.data : [],
  ];

  const rows = collections
    .flat()
    .filter((entry) => entry && typeof entry === 'object');

  if (rows.length === 0) return null;

  return rows
    .map((entry, index) => ({ entry, index, ts: historyTimestamp(entry) }))
    .sort((a, b) => {
      if (b.ts !== a.ts) return b.ts - a.ts;
      return a.index - b.index;
    })[0]
    .entry;
}

function extractYalidineSnapshot(payload) {
  const entity = unwrapYalidineEntity(payload) || {};
  const latestHistory = getLatestHistoryEntry(payload);

  const label = firstText([
    entity.label,
    entity.status_label,
    entity.state_label,
    entity.last_status_label,
    entity.last_state_label,
    entity.current_status_label,
    entity.current_state_label,
    latestHistory?.label,
    latestHistory?.status_label,
    latestHistory?.state_label,
    latestHistory?.status,
    latestHistory?.state,
  ]);

  const status = firstText([
    entity.state,
    entity.status,
    entity.last_status,
    entity.last_state,
    entity.current_status,
    entity.current_state,
    latestHistory?.status,
    latestHistory?.state,
    latestHistory?.label,
  ]);

  const tracking = firstText([
    entity.tracking,
    entity.tracking_number,
    entity.tracking_num,
    entity.barcode,
    entity.parcel_tracking,
    latestHistory?.tracking,
    latestHistory?.tracking_number,
    latestHistory?.tracking_num,
  ]);

  return {
    status: status || label || null,
    label: label || status || null,
    tracking: tracking || null,
  };
}

function hasSnapshotChanges(order, snapshot) {
  return (
    String(snapshot?.status || '') !== String(order?.yalidine_status || '')
    || String(snapshot?.label || '') !== String(order?.yalidine_label || '')
  );
}

function getOrderStatusText(order) {
  return firstText([order?.yalidine_label, order?.yalidine_status]);
}

function getWhatsappMessageId(payload) {
  return firstText([
    payload?.messages?.[0]?.id,
    payload?.messageId,
    payload?.message_id,
  ]);
}

async function recordWhatsappStatusNotification(orderId, statusText, messageId) {
  await db.execute({
    sql: `UPDATE orders
          SET last_whatsapp_status_sent = ?,
              last_whatsapp_status_sent_at = datetime('now'),
              last_whatsapp_message_id = ?
          WHERE id = ?`,
    args: [statusText || null, messageId || null, orderId],
  });
}

async function sendWhatsappStatusNotification(previousOrder, nextOrder) {
  if (!whatsappService.isConfigured()) return;

  const previousStatus = getOrderStatusText(previousOrder);
  const nextStatus = getOrderStatusText(nextOrder);

  if (!nextStatus || nextStatus === previousStatus) return;
  if (!nextOrder?.contact_phone) return;
  if (String(previousOrder?.last_whatsapp_status_sent || '') === String(nextStatus)) return;

  try {
    const result = await whatsappService.sendOrderStatusUpdate(nextOrder, { statusText: nextStatus });
    if (result?.skipped) return;

    await recordWhatsappStatusNotification(nextOrder.id, nextStatus, getWhatsappMessageId(result));
  } catch (err) {
    console.warn(`Failed to send WhatsApp notification for order ${nextOrder.id}:`, err.message);
  }
}

function triggerWhatsappStatusNotification(previousOrder, nextOrder) {
  void sendWhatsappStatusNotification(previousOrder, nextOrder);
}

async function updateOrderSnapshot(orderId, snapshot) {
  await db.execute({
    sql: 'UPDATE orders SET yalidine_status = ?, yalidine_label = ? WHERE id = ?',
    args: [snapshot.status || null, snapshot.label || null, orderId],
  });
}

async function runWithConcurrency(items, limit, worker) {
  const maxWorkers = Math.max(1, Math.min(Number(limit) || 1, items.length || 0));
  if (maxWorkers === 0) return;

  let index = 0;
  await Promise.all(Array.from({ length: maxWorkers }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }));
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
      const trackedOrders = rows.filter((order) => order.yalidine_tracking);

      await runWithConcurrency(trackedOrders, 4, async (order) => {
        try {
          const trackingPayload = await yalidineService.getTracking(order.yalidine_tracking);
          const snapshot = extractYalidineSnapshot(trackingPayload);
          if (!snapshot.status && !snapshot.label) return;
          if (!hasSnapshotChanges(order, snapshot)) return;

          const previousOrder = { ...order };
          await updateOrderSnapshot(order.id, snapshot);
          order.yalidine_status = snapshot.status;
          order.yalidine_label = snapshot.label;
          triggerWhatsappStatusNotification(previousOrder, order);
        } catch (err) {
          console.warn(`Failed to sync Yalidine status for order ${order.id}:`, err.message);
        }
      });
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
   * Update editable order fields from admin panel.
   */
  async update(id, data = {}) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('الطلب غير موجود');
    }

    const allowedFields = [
      'firstname',
      'familyname',
      'contact_phone',
      'address',
      'to_wilaya_name',
      'to_commune_name',
      'is_stopdesk',
      'notes',
      'yalidine_price',
      'delivery_price',
    ];

    const setParts = [];
    const args = [];
    const hasItemsUpdate = Array.isArray(data.items);
    const isApproved = String(existing.order_status || '') === 'approved';

    let processedItems = null;

    if (hasItemsUpdate) {
      if (data.items.length === 0) {
        throw new Error('يجب إضافة عنصر واحد على الأقل للطلب');
      }

      processedItems = [];

      for (const item of data.items) {
        const productId = Number(item.product_id);
        const variantId = Number(item.variant_id);
        const quantity = Number(item.quantity);

        if (!productId || !variantId || !Number.isFinite(quantity) || quantity <= 0) {
          throw new Error('بيانات عناصر الطلب غير صالحة');
        }

        const productResult = await db.execute({
          sql: 'SELECT id, model_name, selling_price, cost_price FROM products WHERE id = ?',
          args: [productId],
        });
        if (productResult.rows.length === 0) {
          throw new Error(`المنتج غير موجود: ${productId}`);
        }
        const product = productResult.rows[0];

        const variantResult = await db.execute({
          sql: 'SELECT id, product_id, color, size, quantity FROM product_variants WHERE id = ? AND product_id = ?',
          args: [variantId, productId],
        });
        if (variantResult.rows.length === 0) {
          throw new Error(`المتغير غير موجود: ${variantId}`);
        }
        const variant = variantResult.rows[0];

        const sellingPrice = item.selling_price != null ? Number(item.selling_price) : Number(product.selling_price);
        const costPrice = item.cost_price != null ? Number(item.cost_price) : Number(product.cost_price);

        const { lineTotal, lineCost, lineProfit } = calculateLineItem(quantity, sellingPrice, costPrice);

        processedItems.push({
          product_id: product.id,
          variant_id: variant.id,
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
    }

    for (const field of allowedFields) {
      if (!(field in data)) continue;

      let value = data[field];

      if (field === 'is_stopdesk') {
        value = value ? 1 : 0;
      }

      if (field === 'yalidine_price' || field === 'delivery_price') {
        if (value == null || value === '') {
          value = null;
        } else {
          const num = Number(value);
          if (Number.isNaN(num) || num < 0) {
            throw new Error(`قيمة غير صالحة للحقل ${field}`);
          }
          value = num;
        }
      }

      setParts.push(`${field} = ?`);
      args.push(value);
    }

    if (setParts.length === 0 && !hasItemsUpdate) {
      return existing;
    }

    await db.execute({
      sql: `UPDATE orders SET ${setParts.join(', ')} WHERE id = ?`,
      args: [...args, id],
    });

    if (hasItemsUpdate) {
      const aggregateByVariant = (rows) => {
        const map = new Map();
        for (const row of rows) {
          const key = Number(row.variant_id);
          const qty = Number(row.quantity || 0);
          map.set(key, (map.get(key) || 0) + qty);
        }
        return map;
      };

      const oldAgg = aggregateByVariant(existing.items || []);
      const newAgg = aggregateByVariant(processedItems);

      if (isApproved) {
        // Revert previous stock reservation for approved orders.
        for (const [variantId, qty] of oldAgg.entries()) {
          await db.execute({
            sql: `UPDATE product_variants SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`,
            args: [qty, variantId],
          });
        }
      }

      try {
        for (const [variantId, qty] of newAgg.entries()) {
          const availableResult = await db.execute({
            sql: 'SELECT quantity FROM product_variants WHERE id = ?',
            args: [variantId],
          });
          if (availableResult.rows.length === 0) {
            throw new Error(`المتغير غير موجود: ${variantId}`);
          }
          const available = Number(availableResult.rows[0].quantity || 0);
          if (available < qty) {
            throw new Error(`الكمية غير كافية لتحديث الطلب (المتوفر: ${available})`);
          }
        }

        if (isApproved) {
          for (const [variantId, qty] of newAgg.entries()) {
            await db.execute({
              sql: `UPDATE product_variants SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?`,
              args: [qty, variantId],
            });
          }
        }
      } catch (err) {
        if (isApproved) {
          // Best-effort rollback to old reservation state.
          for (const [variantId, qty] of newAgg.entries()) {
            await db.execute({
              sql: `UPDATE product_variants SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`,
              args: [qty, variantId],
            });
          }
          for (const [variantId, qty] of oldAgg.entries()) {
            await db.execute({
              sql: `UPDATE product_variants SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?`,
              args: [qty, variantId],
            });
          }
        }
        throw err;
      }

      await db.execute({ sql: 'DELETE FROM order_items WHERE order_id = ?', args: [id] });
      for (const pi of processedItems) {
        await db.execute({
          sql: `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_info, quantity, selling_price, cost_price, line_total, line_cost, line_profit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, pi.product_id, pi.variant_id, pi.product_name, pi.variant_info, pi.quantity, pi.selling_price, pi.cost_price, pi.lineTotal, pi.lineCost, pi.lineProfit],
        });
      }
    }

    if ('delivery_price' in data || hasItemsUpdate) {
      const totalsResult = await db.execute({
        sql: `SELECT COALESCE(SUM(quantity), 0) AS items_count,
                     COALESCE(SUM(line_total), 0) AS items_total,
                     COALESCE(SUM(line_cost), 0) AS total_cost,
                     COALESCE(SUM(line_profit), 0) AS total_profit
              FROM order_items
              WHERE order_id = ?`,
        args: [id],
      });
      const totals = totalsResult.rows[0] || {};

      const current = await db.execute({ sql: 'SELECT delivery_price FROM orders WHERE id = ?', args: [id] });
      const deliveryPrice = Number(current.rows[0]?.delivery_price || 0);
      const itemsTotal = Number(totals.items_total || 0);

      await db.execute({
        sql: `UPDATE orders
              SET items_count = ?, total_amount = ?, total_cost = ?, total_profit = ?
              WHERE id = ?`,
        args: [
          Number(totals.items_count || 0),
          itemsTotal + deliveryPrice,
          Number(totals.total_cost || 0),
          Number(totals.total_profit || 0),
          id,
        ],
      });
    }

    return this.getById(id);
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
    const snapshot = extractYalidineSnapshot(trackingPayload);

    if ((snapshot.status || snapshot.label) && hasSnapshotChanges(order, snapshot)) {
      const previousOrder = { ...order };
      await updateOrderSnapshot(id, snapshot);
      order.yalidine_status = snapshot.status;
      order.yalidine_label = snapshot.label;
      triggerWhatsappStatusNotification(previousOrder, order);
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
      sql: `SELECT id, order_number, firstname, familyname, contact_phone,
                   to_wilaya_name, to_commune_name, yalidine_tracking,
                   yalidine_status, yalidine_label, last_whatsapp_status_sent
            FROM orders
            WHERE yalidine_tracking IS NOT NULL
              AND trim(yalidine_tracking) != ''
            ORDER BY created_at ASC`,
    });

    let synced = 0;
    let updated = 0;
    let failed = 0;

    await runWithConcurrency(result.rows, 4, async (order) => {
      try {
        const trackingPayload = await yalidineService.getTracking(order.yalidine_tracking);
        const snapshot = extractYalidineSnapshot(trackingPayload);
        synced += 1;

        if ((snapshot.status || snapshot.label) && hasSnapshotChanges(order, snapshot)) {
          const previousOrder = { ...order };
          await updateOrderSnapshot(order.id, snapshot);
          order.yalidine_status = snapshot.status;
          order.yalidine_label = snapshot.label;
          triggerWhatsappStatusNotification(previousOrder, order);
          updated += 1;
        }
      } catch (err) {
        failed += 1;
        console.warn(`Failed to sync old order ${order.id}:`, err.message);
      }
    });

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
      sql: `SELECT id, order_number, firstname, familyname, contact_phone,
                   to_wilaya_name, to_commune_name, yalidine_tracking,
                   yalidine_status, yalidine_label, last_whatsapp_status_sent
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

        const snapshot = extractYalidineSnapshot(best);
        const nextTracking = snapshot.tracking || extractParcelTracking(best) || order.yalidine_tracking || null;
        const nextStatus = snapshot.status || order.yalidine_status || null;
        const nextLabel = snapshot.label || order.yalidine_label || null;

        if (
          String(nextTracking || '') !== String(order.yalidine_tracking || '')
          || String(nextStatus || '') !== String(order.yalidine_status || '')
          || String(nextLabel || '') !== String(order.yalidine_label || '')
        ) {
          const previousOrder = { ...order };
          await db.execute({
            sql: `UPDATE orders
                  SET yalidine_tracking = ?, yalidine_status = ?, yalidine_label = ?
                  WHERE id = ?`,
            args: [nextTracking, nextStatus, nextLabel, order.id],
          });
          order.yalidine_tracking = nextTracking;
          order.yalidine_status = nextStatus;
          order.yalidine_label = nextLabel;
          triggerWhatsappStatusNotification(previousOrder, order);
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

    const createdParcel = unwrapYalidineEntity(result);
    const createdSnapshot = extractYalidineSnapshot(result);

    if (createdParcel && (createdSnapshot.tracking || createdSnapshot.status || createdSnapshot.label || extractParcelTracking(createdParcel))) {
      const previousOrder = { ...order };
      await db.execute({
        sql: `UPDATE orders SET order_status = 'approved', yalidine_tracking = ?, yalidine_status = ?, yalidine_label = ? WHERE id = ?`,
        args: [
          createdSnapshot.tracking || extractParcelTracking(createdParcel) || null,
          createdSnapshot.status || 'En preparation',
          createdSnapshot.label || null,
          id,
        ],
      });
      triggerWhatsappStatusNotification(previousOrder, {
        ...order,
        order_status: 'approved',
        yalidine_tracking: createdSnapshot.tracking || extractParcelTracking(createdParcel) || null,
        yalidine_status: createdSnapshot.status || 'En preparation',
        yalidine_label: createdSnapshot.label || null,
      });
    } else {
      const previousOrder = { ...order };
      await db.execute({
        sql: `UPDATE orders SET order_status = 'approved', yalidine_status = 'En preparation' WHERE id = ?`,
        args: [id],
      });
      triggerWhatsappStatusNotification(previousOrder, {
        ...order,
        order_status: 'approved',
        yalidine_status: 'En preparation',
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
