/**
 * Analytics Service
 * Provides dashboard metrics and sales analytics with date filtering (async for Turso).
 */

const { db } = require('../db/connection');

const analyticsService = {
  /**
   * Get today's dashboard summary
   */
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);

    const todayStats = await db.execute({
      sql: `SELECT
        COALESCE(SUM(total_amount), 0) as today_revenue,
        COALESCE(SUM(total_profit), 0) as today_profit,
        COUNT(*) as today_orders
      FROM orders
      WHERE date(created_at) = date(?)`,
      args: [today],
    });

    const lowStock = await db.execute(
      'SELECT COUNT(*) as count FROM product_variants WHERE quantity <= 5'
    );

    const totalProducts = await db.execute('SELECT COUNT(*) as count FROM products');

    const stockValue = await db.execute(`
      SELECT COALESCE(SUM(pv.quantity * p.cost_price), 0) as value
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
    `);

    const stockValueSelling = await db.execute(`
      SELECT COALESCE(SUM(pv.quantity * p.selling_price), 0) as value
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
    `);

    // Enhanced: weekly and monthly stats
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const weekStats = await db.execute({
      sql: `SELECT
        COALESCE(SUM(total_amount), 0) as week_revenue,
        COALESCE(SUM(total_profit), 0) as week_profit,
        COUNT(*) as week_orders
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)`,
      args: [weekAgo, today],
    });

    const monthStats = await db.execute({
      sql: `SELECT
        COALESCE(SUM(total_amount), 0) as month_revenue,
        COALESCE(SUM(total_profit), 0) as month_profit,
        COUNT(*) as month_orders
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)`,
      args: [monthAgo, today],
    });

    const avgOrder = await db.execute(
      'SELECT COALESCE(AVG(total_amount), 0) as avg_order_value FROM orders'
    );

    const totalOrders = await db.execute('SELECT COUNT(*) as count FROM orders');
    const deliveredOrders = await db.execute(
      `SELECT COUNT(*) as count FROM orders WHERE LOWER(order_status) IN ('livrée', 'delivered', 'livré')`
    );
    const returnedOrders = await db.execute(
      `SELECT COUNT(*) as count FROM orders WHERE LOWER(order_status) IN ('retourné', 'returned', 'retour')`
    );

    const total = totalOrders.rows[0].count || 1;

    return {
      today_revenue: todayStats.rows[0].today_revenue,
      today_profit: todayStats.rows[0].today_profit,
      today_orders: todayStats.rows[0].today_orders,
      low_stock_count: lowStock.rows[0].count,
      total_products: totalProducts.rows[0].count,
      stock_value: stockValue.rows[0].value,
      stock_value_selling: stockValueSelling.rows[0].value,
      week_revenue: weekStats.rows[0].week_revenue,
      week_profit: weekStats.rows[0].week_profit,
      week_orders: weekStats.rows[0].week_orders,
      month_revenue: monthStats.rows[0].month_revenue,
      month_profit: monthStats.rows[0].month_profit,
      month_orders: monthStats.rows[0].month_orders,
      avg_order_value: avgOrder.rows[0].avg_order_value,
      delivered_rate: ((deliveredOrders.rows[0].count / total) * 100).toFixed(1),
      return_rate: ((returnedOrders.rows[0].count / total) * 100).toFixed(1),
    };
  },

  /**
   * Revenue and profit by day within a date range
   */
  async getRevenueByDay(from, to) {
    const result = await db.execute({
      sql: `SELECT
        date(created_at) as date,
        SUM(total_amount) as revenue,
        SUM(total_cost) as cost,
        SUM(total_profit) as profit,
        COUNT(*) as order_count
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC`,
      args: [from, to],
    });
    return result.rows;
  },

  /**
   * Top selling products by quantity sold
   */
  async getTopProducts(from, to, limit = 10) {
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
      ORDER BY total_quantity DESC
      LIMIT ?`,
      args: [from, to, limit],
    });
    return result.rows;
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
    return result.rows;
  },

  /**
   * Monthly summary
   */
  async getMonthlySummary(year) {
    const result = await db.execute({
      sql: `SELECT
        strftime('%m', created_at) as month,
        SUM(total_amount) as revenue,
        SUM(total_profit) as profit,
        COUNT(*) as order_count
      FROM orders
      WHERE strftime('%Y', created_at) = ?
      GROUP BY strftime('%m', created_at)
      ORDER BY month ASC`,
      args: [String(year)],
    });
    return result.rows;
  },

  /**
   * Daily performance: orders, revenue, profit, items, avg order value per day
   */
  async getDailyPerformance(from, to) {
    const result = await db.execute({
      sql: `SELECT
        date(created_at) as date,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(total_profit), 0) as profit,
        COALESCE(SUM(items_count), 0) as items_sold,
        COALESCE(AVG(total_amount), 0) as avg_order_value
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC`,
      args: [from, to],
    });
    return result.rows;
  },

  /**
   * Daily top products: top 5 products per day
   */
  async getDailyTopProducts(from, to) {
    const result = await db.execute({
      sql: `SELECT
        date(o.created_at) as date,
        oi.product_name,
        SUM(oi.quantity) as quantity,
        SUM(oi.line_total) as revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)
      GROUP BY date(o.created_at), oi.product_name
      ORDER BY date(o.created_at) ASC, quantity DESC`,
      args: [from, to],
    });

    // Group by day and take top 5 per day
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.date]) grouped[row.date] = [];
      if (grouped[row.date].length < 5) {
        grouped[row.date].push(row);
      }
    }
    return grouped;
  },

  /**
   * Order status breakdown
   */
  async getOrderStatusBreakdown(from, to) {
    const result = await db.execute({
      sql: `SELECT
        COALESCE(order_status, 'pending') as status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
      GROUP BY order_status
      ORDER BY count DESC`,
      args: [from, to],
    });
    return result.rows;
  },

  /**
   * Hourly order distribution
   */
  async getHourlyDistribution(from, to) {
    const result = await db.execute({
      sql: `SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
      GROUP BY strftime('%H', created_at)
      ORDER BY hour ASC`,
      args: [from, to],
    });
    return result.rows;
  },

  /**
   * Sales by wilaya (geographic distribution)
   */
  async getWilayaBreakdown(from, to) {
    const result = await db.execute({
      sql: `SELECT
        COALESCE(to_wilaya_name, 'غير محدد') as wilaya,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(total_profit), 0) as profit
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
      GROUP BY to_wilaya_name
      ORDER BY order_count DESC`,
      args: [from, to],
    });
    return result.rows;
  },

  /**
   * Growth comparison: current 7 days vs previous 7 days
   */
  async getGrowthComparison() {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const current = await db.execute({
      sql: `SELECT
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(total_profit), 0) as profit,
        COUNT(*) as orders
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)`,
      args: [weekAgo, today],
    });

    const previous = await db.execute({
      sql: `SELECT
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(total_profit), 0) as profit,
        COUNT(*) as orders
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) < date(?)`,
      args: [twoWeeksAgo, weekAgo],
    });

    const calc = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : (((cur - prev) / prev) * 100);

    return {
      current: current.rows[0],
      previous: previous.rows[0],
      growth: {
        revenue: calc(current.rows[0].revenue, previous.rows[0].revenue).toFixed(1),
        profit: calc(current.rows[0].profit, previous.rows[0].profit).toFixed(1),
        orders: calc(current.rows[0].orders, previous.rows[0].orders).toFixed(1),
      },
    };
  },

  /**
   * Profit margins by product
   */
  async getProfitMargins(from, to) {
    const result = await db.execute({
      sql: `SELECT
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.line_total) as total_revenue,
        SUM(oi.line_cost) as total_cost,
        SUM(oi.line_profit) as total_profit,
        CASE WHEN SUM(oi.line_total) > 0
          THEN ROUND((SUM(oi.line_profit) * 100.0 / SUM(oi.line_total)), 1)
          ELSE 0
        END as margin_percentage
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)
      GROUP BY oi.product_name
      ORDER BY margin_percentage DESC`,
      args: [from, to],
    });
    return result.rows;
  },
};

module.exports = analyticsService;
