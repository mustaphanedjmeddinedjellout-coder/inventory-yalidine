/**
 * Product Service
 * Handles all product and variant database operations.
 */

const db = require('../db/connection');

const productService = {
  /**
   * Get all products with their variants
   */
  getAll(filters = {}) {
    let query = `
      SELECT p.*,
        (SELECT SUM(pv.quantity) FROM product_variants pv WHERE pv.product_id = p.id) as total_stock
      FROM products p
      WHERE 1=1
    `;
    const params = [];

    if (filters.category) {
      query += ' AND p.category = ?';
      params.push(filters.category);
    }
    if (filters.search) {
      query += ' AND p.model_name LIKE ?';
      params.push(`%${filters.search}%`);
    }
    query += ' ORDER BY p.created_at DESC';

    const products = db.prepare(query).all(...params);

    // Attach variants to each product
    const variantStmt = db.prepare(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY color, size'
    );
    return products.map((p) => ({
      ...p,
      variants: variantStmt.all(p.id),
    }));
  },

  /**
   * Get a single product by ID with variants
   */
  getById(id) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return null;

    product.variants = db
      .prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY color, size')
      .all(id);
    return product;
  },

  /**
   * Create a new product with variants
   */
  create(data) {
    const { model_name, category, selling_price, cost_price, image, variants } = data;

    const result = db.transaction(() => {
      const productResult = db
        .prepare(
          'INSERT INTO products (model_name, category, selling_price, cost_price, image) VALUES (?, ?, ?, ?, ?)'
        )
        .run(model_name, category, selling_price, cost_price, image || null);

      const productId = productResult.lastInsertRowid;

      if (variants && variants.length > 0) {
        const variantStmt = db.prepare(
          'INSERT INTO product_variants (product_id, color, size, quantity) VALUES (?, ?, ?, ?)'
        );
        for (const v of variants) {
          variantStmt.run(productId, v.color || '', v.size || '', v.quantity || 0);
        }
      }

      return productId;
    })();

    return this.getById(result);
  },

  /**
   * Update a product and its variants
   */
  update(id, data) {
    const { model_name, category, selling_price, cost_price, image, variants } = data;

    db.transaction(() => {
      db.prepare(
        `UPDATE products SET model_name = ?, category = ?, selling_price = ?, cost_price = ?, image = COALESCE(?, image), updated_at = datetime('now') WHERE id = ?`
      ).run(model_name, category, selling_price, cost_price, image || null, id);

      if (variants) {
        // Remove old variants not in the new list
        const existingIds = variants.filter((v) => v.id).map((v) => v.id);
        if (existingIds.length > 0) {
          db.prepare(
            `DELETE FROM product_variants WHERE product_id = ? AND id NOT IN (${existingIds.map(() => '?').join(',')})`
          ).run(id, ...existingIds);
        } else {
          db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
        }

        for (const v of variants) {
          if (v.id) {
            db.prepare(
              `UPDATE product_variants SET color = ?, size = ?, quantity = ?, updated_at = datetime('now') WHERE id = ? AND product_id = ?`
            ).run(v.color || '', v.size || '', v.quantity || 0, v.id, id);
          } else {
            db.prepare(
              'INSERT INTO product_variants (product_id, color, size, quantity) VALUES (?, ?, ?, ?)'
            ).run(id, v.color || '', v.size || '', v.quantity || 0);
          }
        }
      }
    })();

    return this.getById(id);
  },

  /**
   * Delete a product and cascade to variants
   */
  delete(id) {
    return db.prepare('DELETE FROM products WHERE id = ?').run(id);
  },

  /**
   * Get low stock variants (quantity below threshold)
   */
  getLowStock(threshold = 5) {
    return db
      .prepare(
        `SELECT pv.*, p.model_name, p.category
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.quantity <= ?
       ORDER BY pv.quantity ASC`
      )
      .all(threshold);
  },

  /**
   * Get all variants for product selection (used in order creation)
   */
  getProductsForOrder() {
    const products = db.prepare('SELECT id, model_name, category, selling_price, cost_price FROM products ORDER BY model_name').all();
    const variantStmt = db.prepare(
      'SELECT id, color, size, quantity FROM product_variants WHERE product_id = ? AND quantity > 0 ORDER BY color, size'
    );
    return products.map((p) => ({
      ...p,
      variants: variantStmt.all(p.id),
    }));
  },
};

module.exports = productService;
