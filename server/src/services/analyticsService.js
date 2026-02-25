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

    return {
      today_revenue: todayStats.rows[0].today_revenue,
      today_profit: todayStats.rows[0].today_profit,
      today_orders: todayStats.rows[0].today_orders,
      low_stock_count: lowStock.rows[0].count,
      total_products: totalProducts.rows[0].count,
      stock_value: stockValue.rows[0].value,
      stock_value_selling: stockValueSelling.rows[0].value,
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
};

module.exports = analyticsService;
