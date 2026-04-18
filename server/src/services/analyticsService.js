/**
 * Analytics Service
 * Provides dashboard metrics and sales analytics with date filtering (async for Turso).
 */

const { db } = require('../db/connection');

const DAY_MS = 24 * 60 * 60 * 1000;

const DELIVERY_STATUS_SQL = "lower(trim(COALESCE(yalidine_status, '')))";
const IS_DELIVERED_SQL = `(
  ${DELIVERY_STATUS_SQL} LIKE '%livr%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%deliver%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%success%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%تم التوصيل%'
)`;
const IS_FAILED_SQL = `(
  ${DELIVERY_STATUS_SQL} LIKE '%echec%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%failed%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%retour%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%return%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%annul%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%cancel%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%refus%'
)`;
const IS_PREPARATION_SQL = `(
  ${DELIVERY_STATUS_SQL} = ''
  OR ${DELIVERY_STATUS_SQL} LIKE '%preparat%'
  OR ${DELIVERY_STATUS_SQL} LIKE '%en preparation%'
)`;
const FUNNEL_CASE_SQL = `CASE
  WHEN COALESCE(order_status, 'pending') <> 'approved' THEN 'pending'
  WHEN ${IS_DELIVERED_SQL} THEN 'delivered'
  WHEN ${IS_FAILED_SQL} THEN 'failed'
  WHEN ${IS_PREPARATION_SQL} THEN 'approved'
  ELSE 'in_delivery'
END`;

function toDateOnly(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function shiftDate(dateString, offsetDays) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function getRangeLength(from, to) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const diff = Math.round((end - start) / DAY_MS) + 1;
  return Math.max(diff, 1);
}

function normalizeSummary(row = {}) {
  const revenue = Number(row.revenue || 0);
  const profit = Number(row.profit || 0);
  const orders = Number(row.orders || 0);
  const aov = orders > 0 ? revenue / orders : 0;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    profit,
    orders,
    aov,
    margin_pct: Number(marginPct.toFixed(2)),
  };
}

function buildMetricComparison(current, previous) {
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    percent_change: previous === 0 ? null : Number(((delta / previous) * 100).toFixed(2)),
  };
}

function buildComparison(currentSummary, previousSummary) {
  return {
    revenue: buildMetricComparison(currentSummary.revenue, previousSummary.revenue),
    profit: buildMetricComparison(currentSummary.profit, previousSummary.profit),
    orders: buildMetricComparison(currentSummary.orders, previousSummary.orders),
    aov: buildMetricComparison(currentSummary.aov, previousSummary.aov),
    margin_pct: buildMetricComparison(currentSummary.margin_pct, previousSummary.margin_pct),
  };
}

function getFunnelCount(funnelRows, key) {
  return Number(funnelRows.find((row) => row.key === key)?.count || 0);
}

async function getPeriodSummary(from, to) {
  const result = await db.execute({
    sql: `SELECT
      COALESCE(SUM(total_amount), 0) as revenue,
      COALESCE(SUM(total_profit), 0) as profit,
      COUNT(*) as orders
    FROM orders
    WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)`,
    args: [from, to],
  });

  return normalizeSummary(result.rows[0]);
}

async function getOrderFunnel(from, to) {
  const result = await db.execute({
    sql: `SELECT
      ${FUNNEL_CASE_SQL} as funnel_status,
      COUNT(*) as count
    FROM orders
    WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    GROUP BY funnel_status`,
    args: [from, to],
  });

  const counts = Object.fromEntries(result.rows.map((row) => [row.funnel_status, Number(row.count || 0)]));
  const order = [
    ['pending', 'قيد الانتظار'],
    ['approved', 'مؤكد'],
    ['in_delivery', 'قيد التوصيل'],
    ['delivered', 'تم التوصيل'],
    ['failed', 'فشل / مرتجع'],
  ];

  return order.map(([key, label]) => ({
    key,
    label,
    count: counts[key] || 0,
  }));
}

async function getDeliveryStatusBreakdown(from, to) {
  const result = await db.execute({
    sql: `SELECT
      COALESCE(NULLIF(trim(yalidine_status), ''), CASE
        WHEN order_status = 'approved' THEN 'En preparation'
        ELSE 'Pending dispatch'
      END) as status,
      COUNT(*) as total_orders
    FROM orders
    WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    GROUP BY status
    ORDER BY total_orders DESC, status ASC`,
    args: [from, to],
  });

  return result.rows.map((row) => ({
    status: row.status,
    total_orders: Number(row.total_orders || 0),
  }));
}

async function getDeliveryByWilaya(from, to, limit = 10) {
  const result = await db.execute({
    sql: `SELECT
      COALESCE(NULLIF(trim(to_wilaya_name), ''), 'غير محددة') as wilaya,
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as revenue,
      SUM(CASE WHEN ${IS_DELIVERED_SQL} THEN 1 ELSE 0 END) as delivered_orders,
      SUM(CASE WHEN ${IS_FAILED_SQL} THEN 1 ELSE 0 END) as failed_orders
    FROM orders
    WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    GROUP BY wilaya
    ORDER BY total_orders DESC, revenue DESC
    LIMIT ?`,
    args: [from, to, limit],
  });

  return result.rows.map((row) => {
    const totalOrders = Number(row.total_orders || 0);
    const deliveredOrders = Number(row.delivered_orders || 0);
    const failedOrders = Number(row.failed_orders || 0);
    const resolvedOrders = deliveredOrders + failedOrders;

    return {
      wilaya: row.wilaya,
      total_orders: totalOrders,
      revenue: Number(row.revenue || 0),
      delivered_orders: deliveredOrders,
      failed_orders: failedOrders,
      success_rate: resolvedOrders > 0 ? Number(((deliveredOrders / resolvedOrders) * 100).toFixed(2)) : 0,
    };
  });
}

async function getDeliveryMethodBreakdown(from, to) {
  const result = await db.execute({
    sql: `SELECT
      CASE WHEN COALESCE(is_stopdesk, 0) = 1 THEN 'stopdesk' ELSE 'home' END as method,
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as revenue,
      SUM(CASE WHEN ${IS_DELIVERED_SQL} THEN 1 ELSE 0 END) as delivered_orders,
      SUM(CASE WHEN ${IS_FAILED_SQL} THEN 1 ELSE 0 END) as failed_orders
    FROM orders
    WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    GROUP BY method
    ORDER BY total_orders DESC`,
    args: [from, to],
  });

  return result.rows.map((row) => {
    const deliveredOrders = Number(row.delivered_orders || 0);
    const failedOrders = Number(row.failed_orders || 0);
    const resolvedOrders = deliveredOrders + failedOrders;

    return {
      method: row.method,
      total_orders: Number(row.total_orders || 0),
      revenue: Number(row.revenue || 0),
      delivered_orders: deliveredOrders,
      failed_orders: failedOrders,
      success_rate: resolvedOrders > 0 ? Number(((deliveredOrders / resolvedOrders) * 100).toFixed(2)) : 0,
    };
  });
}

async function getUrgentRestock(from, to, limit = 5) {
  const result = await db.execute({
    sql: `SELECT
      pv.id,
      pv.product_id,
      p.model_name,
      p.category,
      pv.color,
      pv.size,
      pv.quantity,
      COALESCE(sales.quantity_sold_30d, 0) as quantity_sold_30d,
      CASE
        WHEN COALESCE(sales.quantity_sold_30d, 0) > 0
          THEN ROUND((pv.quantity * 30.0) / sales.quantity_sold_30d, 1)
        ELSE NULL
      END as days_of_cover
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN (
      SELECT
        oi.variant_id,
        SUM(oi.quantity) as quantity_sold_30d
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)
      GROUP BY oi.variant_id
    ) sales ON sales.variant_id = pv.id
    WHERE pv.quantity <= 5
      OR (
        COALESCE(sales.quantity_sold_30d, 0) >= 3
        AND pv.quantity <= COALESCE(sales.quantity_sold_30d, 0)
      )
    ORDER BY
      CASE
        WHEN COALESCE(sales.quantity_sold_30d, 0) > 0 THEN (pv.quantity * 1.0) / sales.quantity_sold_30d
        ELSE 999999
      END ASC,
      quantity_sold_30d DESC,
      pv.quantity ASC
    LIMIT ?`,
    args: [from, to, limit],
  });

  return result.rows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    model_name: row.model_name,
    category: row.category,
    color: row.color,
    size: row.size,
    quantity: Number(row.quantity || 0),
    quantity_sold_30d: Number(row.quantity_sold_30d || 0),
    days_of_cover: row.days_of_cover == null ? null : Number(row.days_of_cover),
  }));
}

async function getInventorySummary() {
  const [lowStock, totalProducts, stockValue, stockValueSelling] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM product_variants WHERE quantity <= 5'),
    db.execute('SELECT COUNT(*) as count FROM products'),
    db.execute(`
      SELECT COALESCE(SUM(pv.quantity * p.cost_price), 0) as value
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
    `),
    db.execute(`
      SELECT COALESCE(SUM(pv.quantity * p.selling_price), 0) as value
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
    `),
  ]);

  return {
    low_stock_count: Number(lowStock.rows[0].count || 0),
    total_products: Number(totalProducts.rows[0].count || 0),
    stock_value: Number(stockValue.rows[0].value || 0),
    stock_value_selling: Number(stockValueSelling.rows[0].value || 0),
  };
}

async function getOverviewPayload(from, to) {
  const rangeLength = getRangeLength(from, to);
  const previousTo = shiftDate(from, -1);
  const previousFrom = shiftDate(from, -rangeLength);

  const [summary, previousSummary, orderFunnel, deliveryStatuses, deliveryByWilaya, deliveryMethods] = await Promise.all([
    getPeriodSummary(from, to),
    getPeriodSummary(previousFrom, previousTo),
    getOrderFunnel(from, to),
    getDeliveryStatusBreakdown(from, to),
    getDeliveryByWilaya(from, to),
    getDeliveryMethodBreakdown(from, to),
  ]);

  const deliveredCount = getFunnelCount(orderFunnel, 'delivered');
  const failedCount = getFunnelCount(orderFunnel, 'failed');
  const approvedCount = getFunnelCount(orderFunnel, 'approved');
  const inDeliveryCount = getFunnelCount(orderFunnel, 'in_delivery');
  const resolvedCount = deliveredCount + failedCount;

  return {
    range: {
      current: { from, to },
      previous: { from: previousFrom, to: previousTo },
      days: rangeLength,
    },
    summary,
    previous_summary: previousSummary,
    comparison: buildComparison(summary, previousSummary),
    order_funnel: orderFunnel,
    delivery_summary: {
      delivered_orders: deliveredCount,
      failed_orders: failedCount,
      active_shipments: approvedCount + inDeliveryCount,
      success_rate: resolvedCount > 0 ? Number(((deliveredCount / resolvedCount) * 100).toFixed(2)) : 0,
      failure_rate: resolvedCount > 0 ? Number(((failedCount / resolvedCount) * 100).toFixed(2)) : 0,
    },
    delivery_statuses: deliveryStatuses,
    delivery_by_wilaya: deliveryByWilaya,
    delivery_methods: deliveryMethods,
  };
}

const analyticsService = {
  /**
   * Get dashboard summary with operational comparisons
   */
  async getDashboard() {
    const today = toDateOnly();
    const yesterday = shiftDate(today, -1);
    const rollingFrom = shiftDate(today, -29);

    const [inventorySummary, todayOverview, rollingOverview, urgentRestock] = await Promise.all([
      getInventorySummary(),
      getOverviewPayload(today, today),
      getOverviewPayload(rollingFrom, today),
      getUrgentRestock(rollingFrom, today),
    ]);

    return {
      today_revenue: todayOverview.summary.revenue,
      today_profit: todayOverview.summary.profit,
      today_orders: todayOverview.summary.orders,
      today_aov: todayOverview.summary.aov,
      today_margin_pct: todayOverview.summary.margin_pct,
      today_summary: todayOverview.summary,
      yesterday_summary: todayOverview.previous_summary,
      comparison: todayOverview.comparison,
      comparison_range: {
        current: { from: today, to: today },
        previous: { from: yesterday, to: yesterday },
      },
      order_funnel: rollingOverview.order_funnel,
      delivery_summary: rollingOverview.delivery_summary,
      delivery_statuses: rollingOverview.delivery_statuses,
      delivery_by_wilaya: rollingOverview.delivery_by_wilaya,
      delivery_methods: rollingOverview.delivery_methods,
      urgent_restock: urgentRestock,
      operations_range: rollingOverview.range.current,
      ...inventorySummary,
    };
  },

  /**
   * Get overview for a custom period, including previous-period comparison.
   */
  async getOverview(from, to) {
    return getOverviewPayload(from, to);
  },

  /**
   * Revenue and profit by day within a date range
   */
  async getRevenueByDay(from, to) {
    const result = await db.execute({
      sql: `SELECT
        date(created_at) as date,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(total_cost), 0) as cost,
        COALESCE(SUM(total_profit), 0) as profit,
        COUNT(*) as order_count,
        CASE
          WHEN COALESCE(SUM(total_amount), 0) = 0 THEN 0
          ELSE ROUND((COALESCE(SUM(total_profit), 0) * 100.0) / SUM(total_amount), 2)
        END as margin_pct
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC`,
      args: [from, to],
    });

    return result.rows.map((row) => ({
      ...row,
      revenue: Number(row.revenue || 0),
      cost: Number(row.cost || 0),
      profit: Number(row.profit || 0),
      order_count: Number(row.order_count || 0),
      margin_pct: Number(row.margin_pct || 0),
    }));
  },

  /**
   * Top selling products, sortable by quantity, revenue, or profit
   */
  async getTopProducts(from, to, limit = 10, sortBy = 'quantity') {
    const orderByMap = {
      quantity: 'total_quantity DESC, total_profit DESC, total_revenue DESC',
      revenue: 'total_revenue DESC, total_profit DESC, total_quantity DESC',
      profit: 'total_profit DESC, total_revenue DESC, total_quantity DESC',
    };
    const orderBy = orderByMap[sortBy] || orderByMap.quantity;

    const result = await db.execute({
      sql: `SELECT
        oi.product_id,
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.line_total) as total_revenue,
        SUM(oi.line_profit) as total_profit
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)
      GROUP BY oi.product_id, oi.product_name
      ORDER BY ${orderBy}
      LIMIT ?`,
      args: [from, to, limit],
    });

    return result.rows.map((row) => ({
      ...row,
      total_quantity: Number(row.total_quantity || 0),
      total_revenue: Number(row.total_revenue || 0),
      total_profit: Number(row.total_profit || 0),
    }));
  },

  /**
   * Sales breakdown by category
   */
  async getSalesByCategory(from, to) {
    const result = await db.execute({
      sql: `SELECT
        p.category,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.line_total) as total_revenue,
        SUM(oi.line_profit) as total_profit
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)
      GROUP BY p.category
      ORDER BY total_revenue DESC`,
      args: [from, to],
    });

    return result.rows.map((row) => ({
      ...row,
      total_quantity: Number(row.total_quantity || 0),
      total_revenue: Number(row.total_revenue || 0),
      total_profit: Number(row.total_profit || 0),
    }));
  },

  /**
   * Monthly summary
   */
  async getMonthlySummary(year) {
    const result = await db.execute({
      sql: `SELECT
        strftime('%m', created_at) as month,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(total_profit), 0) as profit,
        COUNT(*) as order_count
      FROM orders
      WHERE strftime('%Y', created_at) = ?
      GROUP BY strftime('%m', created_at)
      ORDER BY month ASC`,
      args: [String(year)],
    });

    return result.rows.map((row) => ({
      ...row,
      revenue: Number(row.revenue || 0),
      profit: Number(row.profit || 0),
      order_count: Number(row.order_count || 0),
    }));
  },
};

module.exports = analyticsService;
