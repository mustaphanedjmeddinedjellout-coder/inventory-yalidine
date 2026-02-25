/**
 * Database Seed Script
 * Seeds the database with real product inventory on first run.
 * Only inserts if the products table is empty.
 */

function seedIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (count > 0) return; // Already has data

  console.log('Seeding database with product inventory...');

  const insertProduct = db.prepare(`
    INSERT INTO products (model_name, category, selling_price, cost_price)
    VALUES (?, ?, ?, ?)
  `);

  const insertVariant = db.prepare(`
    INSERT INTO product_variants (product_id, color, size, quantity)
    VALUES (?, ?, ?, ?)
  `);

  const seedTransaction = db.transaction(() => {
    // 1. Zip Ralph — T-Shirt 3700/2500
    let pid = insertProduct.run('Zip Ralph', 'T-Shirt', 3700, 2500).lastInsertRowid;
    insertVariant.run(pid, 'Blue', 'L', 2);
    insertVariant.run(pid, 'Olives', 'L', 2);
    insertVariant.run(pid, 'Marron', 'L', 1);
    insertVariant.run(pid, 'Noir', 'L', 1);
    insertVariant.run(pid, 'Olives', 'XL', 2);
    insertVariant.run(pid, 'Marron', 'XL', 1);
    insertVariant.run(pid, 'Blue', 'XL', 1);
    insertVariant.run(pid, 'Noir', 'XL', 1);
    insertVariant.run(pid, 'Blue', 'XXL', 2);
    insertVariant.run(pid, 'Noir', 'XXL', 1);
    insertVariant.run(pid, 'Marron', 'XXL', 1);
    insertVariant.run(pid, 'Olives', 'XXL', 1);

    // 2. Ralph f 30 — T-Shirt 3700/2500
    pid = insertProduct.run('Ralph f 30', 'T-Shirt', 3700, 2500).lastInsertRowid;
    insertVariant.run(pid, 'Marron', 'M', 5);
    insertVariant.run(pid, 'Noir', 'M', 4);
    insertVariant.run(pid, 'Beige', 'M', 1);
    insertVariant.run(pid, 'Marron', 'L', 8);
    insertVariant.run(pid, 'Beige', 'L', 1);
    insertVariant.run(pid, 'Noir', 'L', 2);
    insertVariant.run(pid, 'Blanc', 'L', 1);
    insertVariant.run(pid, 'Marron', 'XL', 5);
    insertVariant.run(pid, 'Blanc', 'XL', 3);
    insertVariant.run(pid, 'Noir', 'XL', 2);
    insertVariant.run(pid, 'Marron', 'XXL', 3);
    insertVariant.run(pid, 'Blanc', 'XXL', 2);

    // 3. F 30 zip — T-Shirt 3700/2500
    pid = insertProduct.run('F 30 zip', 'T-Shirt', 3700, 2500).lastInsertRowid;
    insertVariant.run(pid, 'Blanc', 'L', 1);
    insertVariant.run(pid, 'Blue', 'L', 1);
    insertVariant.run(pid, 'Noir', 'L', 3);
    insertVariant.run(pid, 'Noir', 'XL', 1);
    insertVariant.run(pid, 'Noir', 'XXL', 2);

    // 4. Ralph — T-Shirt 3700/2500
    pid = insertProduct.run('Ralph', 'T-Shirt', 3700, 2500).lastInsertRowid;
    insertVariant.run(pid, 'Blanc', 'S', 1);
    insertVariant.run(pid, 'Blanc', 'M', 1);
    insertVariant.run(pid, 'Blue', 'S', 1);
    insertVariant.run(pid, 'Blue', 'L', 1);
    insertVariant.run(pid, 'Blue', 'XXL', 1);

    // 5. Amer — T-Shirt 3700/2500
    pid = insertProduct.run('Amer', 'T-Shirt', 3700, 2500).lastInsertRowid;
    insertVariant.run(pid, 'Marron', 'XXL', 1);
    insertVariant.run(pid, 'Olives', 'XXL', 1);
    insertVariant.run(pid, 'Blanc', 'XXL', 1);
    insertVariant.run(pid, 'Noir', 'XXL', 1);

    // 6. V Neck — T-Shirt 4000/3300
    pid = insertProduct.run('V Neck', 'T-Shirt', 4000, 3300).lastInsertRowid;
    insertVariant.run(pid, 'Noir', 'XXL', 2);
    insertVariant.run(pid, 'Vert', 'XXL', 1);
    insertVariant.run(pid, 'Blue', 'XXL', 1);

    // 7. Croco Shoe — Shoes 4500/2900
    pid = insertProduct.run('Croco Shoe', 'Shoes', 4500, 2900).lastInsertRowid;
    insertVariant.run(pid, 'Noir', '40', 2);
    insertVariant.run(pid, 'Noir', '41', 4);
    insertVariant.run(pid, 'Noir', '42', 4);
    insertVariant.run(pid, 'Noir', '43', 2);

    // 8. Pantalon SNTP — Pants 3700/2500
    pid = insertProduct.run('Pantalon SNTP', 'Pants', 3700, 2500).lastInsertRowid;
    insertVariant.run(pid, 'Marron', '30', 3);
    insertVariant.run(pid, 'Marron', '31', 3);
    insertVariant.run(pid, 'Marron', '32', 3);
    insertVariant.run(pid, 'Marron', '33', 6);
    insertVariant.run(pid, 'Marron', '34', 3);
    insertVariant.run(pid, 'Marron', '36', 3);
    insertVariant.run(pid, 'Marron', '38', 3);
    insertVariant.run(pid, 'Beige', '30', 1);
    insertVariant.run(pid, 'Beige', '31', 1);
    insertVariant.run(pid, 'Beige', '32', 1);
    insertVariant.run(pid, 'Beige', '33', 2);
    insertVariant.run(pid, 'Beige', '34', 1);
    insertVariant.run(pid, 'Beige', '36', 1);
    insertVariant.run(pid, 'Beige', '38', 1);

    // 9. Pantalon Oversize — Pants 4200/3000
    pid = insertProduct.run('Pantalon Oversize', 'Pants', 4200, 3000).lastInsertRowid;
    insertVariant.run(pid, 'Noir', 'S', 6);
    insertVariant.run(pid, 'Noir', 'M', 6);
    insertVariant.run(pid, 'Noir', 'L', 6);

    // 10. Chaussure Blanc — Shoes 3500/1900
    pid = insertProduct.run('Chaussure Blanc', 'Shoes', 3500, 1900).lastInsertRowid;
    insertVariant.run(pid, 'Blanc', '40', 2);
    insertVariant.run(pid, 'Blanc', '41', 1);
    insertVariant.run(pid, 'Blanc', '42', 1);
    insertVariant.run(pid, 'Blanc', '43', 1);

    // 11. Pull SNTP — T-Shirt 3700/2500
    pid = insertProduct.run('Pull SNTP', 'T-Shirt', 3700, 2500).lastInsertRowid;
    ['Marron', 'Vert', 'Beige'].forEach(color => {
      ['S', 'M', 'L', 'XL', 'XXL'].forEach(size => {
        insertVariant.run(pid, color, size, 2);
      });
    });

    // 12. F30 9fayl — T-Shirt 3700/2500
    pid = insertProduct.run('F30 9fayl', 'T-Shirt', 3700, 2500).lastInsertRowid;
    insertVariant.run(pid, 'Blanc', 'M', 1);
    insertVariant.run(pid, 'Vert Olive', 'M', 2);
    insertVariant.run(pid, 'Blanc', 'L', 8);
    insertVariant.run(pid, 'Vert Olive', 'L', 4);
    insertVariant.run(pid, 'Noir', 'L', 1);
    insertVariant.run(pid, 'Noir', 'XL', 2);
    insertVariant.run(pid, 'Vert', 'XL', 2);
    insertVariant.run(pid, 'Blanc', 'XL', 2);
    insertVariant.run(pid, 'Vert', 'XXL', 2);
    insertVariant.run(pid, 'Vert Olive', 'XXL', 2);
    insertVariant.run(pid, 'Noir', 'XXL', 2);
    insertVariant.run(pid, 'Marron', 'XXL', 1);
    insertVariant.run(pid, 'Blanc', 'XXL', 4);
  });

  seedTransaction();
  console.log('Seeded 12 products with all variants.');
}

module.exports = seedIfEmpty;

// Allow running directly: node src/db/seed.js
if (require.main === module) {
  const db = require('./connection');
  seedIfEmpty(db);
  process.exit(0);
}
