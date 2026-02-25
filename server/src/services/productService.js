/**
 * Product Service
 * Handles all product and variant database operations (async for Turso).
 */

const { db } = require('../db/connection');

const productService = {
  /**
   * Get all products with their variants
   */
  async getAll(filters = {}) {
    let query = `
      SELECT p.*,
        (SELECT SUM(pv.quantity) FROM product_variants pv WHERE pv.product_id = p.id) as total_stock
      FROM products p
      WHERE 1=1
    `;
    const args = [];

    if (filters.category) {
      query += ' AND p.category = ?';
      args.push(filters.category);
    }
    if (filters.search) {
      query += ' AND p.model_name LIKE ?';
      args.push(`%${filters.search}%`);
    }
    query += ' ORDER BY p.created_at DESC';

    const productsResult = await db.execute({ sql: query, args });

    // Attach variants to each product
    const products = [];
    for (const p of productsResult.rows) {
      const varResult = await db.execute({
        sql: 'SELECT * FROM product_variants WHERE product_id = ? ORDER BY color, size',
        args: [p.id],
      });
      products.push({ ...p, variants: varResult.rows });
    }
    return products;
  },

  /**
   * Get a single product by ID with variants
   */
  async getById(id) {
    const result = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return null;

    const product = { ...result.rows[0] };
    const varResult = await db.execute({
      sql: 'SELECT * FROM product_variants WHERE product_id = ? ORDER BY color, size',
      args: [id],
    });
    product.variants = varResult.rows;
    return product;
  },

  /**
   * Create a new product with variants
   */
  async create(data) {
    const { model_name, category, selling_price, cost_price, image, variants } = data;

    const productResult = await db.execute({
      sql: 'INSERT INTO products (model_name, category, selling_price, cost_price, image) VALUES (?, ?, ?, ?, ?)',
      args: [model_name, category, selling_price, cost_price, image || null],
    });

    const productId = Number(productResult.lastInsertRowid);

    if (variants && variants.length > 0) {
      for (const v of variants) {
        await db.execute({
          sql: 'INSERT INTO product_variants (product_id, color, size, quantity) VALUES (?, ?, ?, ?)',
          args: [productId, v.color || '', v.size || '', v.quantity || 0],
        });
      }
    }

    return this.getById(productId);
  },

  /**
   * Update a product and its variants
   */
  async update(id, data) {
    const { model_name, category, selling_price, cost_price, image, variants } = data;

    await db.execute({
      sql: `UPDATE products SET model_name = ?, category = ?, selling_price = ?, cost_price = ?, image = COALESCE(?, image), updated_at = datetime('now') WHERE id = ?`,
      args: [model_name, category, selling_price, cost_price, image || null, id],
    });

    if (variants) {
      const existingIds = variants.filter((v) => v.id).map((v) => v.id);
      if (existingIds.length > 0) {
        const placeholders = existingIds.map(() => '?').join(',');
        await db.execute({
          sql: `DELETE FROM product_variants WHERE product_id = ? AND id NOT IN (${placeholders})`,
          args: [id, ...existingIds],
        });
      } else {
        await db.execute({
          sql: 'DELETE FROM product_variants WHERE product_id = ?',
          args: [id],
        });
      }

      for (const v of variants) {
        if (v.id) {
          await db.execute({
            sql: `UPDATE product_variants SET color = ?, size = ?, quantity = ?, updated_at = datetime('now') WHERE id = ? AND product_id = ?`,
            args: [v.color || '', v.size || '', v.quantity || 0, v.id, id],
          });
        } else {
          await db.execute({
            sql: 'INSERT INTO product_variants (product_id, color, size, quantity) VALUES (?, ?, ?, ?)',
            args: [id, v.color || '', v.size || '', v.quantity || 0],
          });
        }
      }
    }

    return this.getById(id);
  },

  /**
   * Delete a product and cascade to variants
   */
  async delete(id) {
    // Delete variants first, then product (cascade may not work over HTTP)
    await db.execute({ sql: 'DELETE FROM product_variants WHERE product_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM order_items WHERE product_id = ?', args: [id] });
    return db.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] });
  },

  /**
   * Get low stock variants (quantity below threshold)
   */
  async getLowStock(threshold = 5) {
    const result = await db.execute({
      sql: `SELECT pv.*, p.model_name, p.category
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.quantity <= ?
       ORDER BY pv.quantity ASC`,
      args: [threshold],
    });
    return result.rows;
  },

  /**
   * Get all variants for product selection (used in order creation)
   */
  async getProductsForOrder() {
    const productsResult = await db.execute(
      'SELECT id, model_name, category, selling_price, cost_price FROM products ORDER BY model_name'
    );
    const products = [];
    for (const p of productsResult.rows) {
      const varResult = await db.execute({
        sql: 'SELECT id, color, size, quantity FROM product_variants WHERE product_id = ? AND quantity > 0 ORDER BY color, size',
        args: [p.id],
      });
      products.push({ ...p, variants: varResult.rows });
    }
    return products;
  },
};

module.exports = productService;
