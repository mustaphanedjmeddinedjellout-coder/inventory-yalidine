/**
 * Analytics Service
 * Provides dashboard metrics and sales analytics with date filtering.
 */

const db = require('../db/connection');

const analyticsService = {
  /**
   * Get today's dashboard summary
   */
  getDashboard() {
    const today = new Date().toISOString().slice(0, 10);

    // Today's revenue and profit
    const todayStats = db.prepare(`
      SELECT
        COALESCE(SUM(total_amount), 0) as today_revenue,
        COALESCE(SUM(total_profit), 0) as today_profit,
        COUNT(*) as today_orders
      FROM orders
      WHERE date(created_at) = date(?)
    `).get(today);

    // Low stock variants count
    const lowStock = db.prepare(`
      SELECT COUNT(*) as count
      FROM product_variants
      WHERE quantity <= 5
    `).get();

    // Total products
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();

    // Total stock value (by cost price)
    const stockValue = db.prepare(`
      SELECT COALESCE(SUM(pv.quantity * p.cost_price), 0) as value
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
    `).get();

    // Total stock value (by selling price)
    const stockValueSelling = db.prepare(`
      SELECT COALESCE(SUM(pv.quantity * p.selling_price), 0) as value
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
    `).get();

    return {
      today_revenue: todayStats.today_revenue,
      today_profit: todayStats.today_profit,
      today_orders: todayStats.today_orders,
      low_stock_count: lowStock.count,
      total_products: totalProducts.count,
      stock_value: stockValue.value,
      stock_value_selling: stockValueSelling.value,
    };
  },

  /**
   * Revenue and profit by day within a date range
   */
  getRevenueByDay(from, to) {
    return db.prepare(`
      SELECT
        date(created_at) as date,
        SUM(total_amount) as revenue,
        SUM(total_cost) as cost,
        SUM(total_profit) as profit,
        COUNT(*) as order_count
      FROM orders
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `).all(from, to);
  },

  /**
   * Top selling products by quantity sold
   */
  getTopProducts(from, to, limit = 10) {
    return db.prepare(`
      SELECT
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
      LIMIT ?
    `).all(from, to, limit);
  },

  /**
   * Sales breakdown by category
   */
  getSalesByCategory(from, to) {
    return db.prepare(`
      SELECT
        p.category,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.line_total) as total_revenue,
        SUM(oi.line_profit) as total_profit
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `).all(from, to);
  },

  /**
   * Monthly summary
   */
  getMonthlySummary(year) {
    return db.prepare(`
      SELECT
        strftime('%m', created_at) as month,
        SUM(total_amount) as revenue,
        SUM(total_profit) as profit,
        COUNT(*) as order_count
      FROM orders
      WHERE strftime('%Y', created_at) = ?
      GROUP BY strftime('%m', created_at)
      ORDER BY month ASC
    `).all(String(year));
  },
};

module.exports = analyticsService;
