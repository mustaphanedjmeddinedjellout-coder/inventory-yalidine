/**
 * Database Seed Script
 * Populates the database with sample products and variants for testing.
 * Run with: npm run seed
 */

const db = require('./connection');

function seed() {
  console.log('Seeding database...');

  // Clear existing data
  db.exec(`
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM product_variants;
    DELETE FROM products;
  `);

  const insertProduct = db.prepare(`
    INSERT INTO products (model_name, category, selling_price, cost_price)
    VALUES (?, ?, ?, ?)
  `);

  const insertVariant = db.prepare(`
    INSERT INTO product_variants (product_id, color, size, quantity)
    VALUES (?, ?, ?, ?)
  `);

  const products = [
    { model: 'قميص كلاسيكي', category: 'T-Shirt', sell: 120, cost: 60 },
    { model: 'تيشيرت رياضي', category: 'T-Shirt', sell: 95, cost: 45 },
    { model: 'بنطلون جينز', category: 'Pants', sell: 250, cost: 130 },
    { model: 'بنطلون قماش', category: 'Pants', sell: 200, cost: 100 },
    { model: 'حذاء رياضي', category: 'Shoes', sell: 350, cost: 180 },
    { model: 'حذاء كلاسيكي', category: 'Shoes', sell: 400, cost: 200 },
  ];

  const colors = ['أسود', 'أبيض', 'أزرق', 'أحمر'];
  const sizes = ['S', 'M', 'L', 'XL'];

  const seedTransaction = db.transaction(() => {
    for (const p of products) {
      const result = insertProduct.run(p.model, p.category, p.sell, p.cost);
      const productId = result.lastInsertRowid;

      // Create 4 variants per product
      for (let i = 0; i < 4; i++) {
        insertVariant.run(
          productId,
          colors[i % colors.length],
          sizes[i % sizes.length],
          Math.floor(Math.random() * 50) + 5
        );
      }
    }
  });

  seedTransaction();
  console.log('Database seeded successfully with sample data.');
  process.exit(0);
}

seed();
