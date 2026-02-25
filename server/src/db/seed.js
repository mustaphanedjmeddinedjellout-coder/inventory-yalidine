/**
 * Database Seed Script
 * Seeds the database with real product inventory on first run.
 * Only inserts if the products table is empty.
 */

async function seedIfEmpty(db) {
  const countResult = await db.execute('SELECT COUNT(*) as c FROM products');
  if (countResult.rows[0].c > 0) return;

  console.log('Seeding database with product inventory...');

  async function insertProduct(name, category, sell, cost) {
    const r = await db.execute({
      sql: 'INSERT INTO products (model_name, category, selling_price, cost_price) VALUES (?, ?, ?, ?)',
      args: [name, category, sell, cost],
    });
    return Number(r.lastInsertRowid);
  }

  async function insertVariant(pid, color, size, qty) {
    await db.execute({
      sql: 'INSERT INTO product_variants (product_id, color, size, quantity) VALUES (?, ?, ?, ?)',
      args: [pid, color, size, qty],
    });
  }

  // 1. Zip Ralph — T-Shirt 3700/2500
  let pid = await insertProduct('Zip Ralph', 'T-Shirt', 3700, 2500);
  await insertVariant(pid, 'Blue', 'L', 2);
  await insertVariant(pid, 'Olives', 'L', 2);
  await insertVariant(pid, 'Marron', 'L', 1);
  await insertVariant(pid, 'Noir', 'L', 1);
  await insertVariant(pid, 'Olives', 'XL', 2);
  await insertVariant(pid, 'Marron', 'XL', 1);
  await insertVariant(pid, 'Blue', 'XL', 1);
  await insertVariant(pid, 'Noir', 'XL', 1);
  await insertVariant(pid, 'Blue', 'XXL', 2);
  await insertVariant(pid, 'Noir', 'XXL', 1);
  await insertVariant(pid, 'Marron', 'XXL', 1);
  await insertVariant(pid, 'Olives', 'XXL', 1);

  // 2. Ralph f 30 — T-Shirt 3700/2500
  pid = await insertProduct('Ralph f 30', 'T-Shirt', 3700, 2500);
  await insertVariant(pid, 'Marron', 'M', 5);
  await insertVariant(pid, 'Noir', 'M', 4);
  await insertVariant(pid, 'Beige', 'M', 1);
  await insertVariant(pid, 'Marron', 'L', 8);
  await insertVariant(pid, 'Beige', 'L', 1);
  await insertVariant(pid, 'Noir', 'L', 2);
  await insertVariant(pid, 'Blanc', 'L', 1);
  await insertVariant(pid, 'Marron', 'XL', 5);
  await insertVariant(pid, 'Blanc', 'XL', 3);
  await insertVariant(pid, 'Noir', 'XL', 2);
  await insertVariant(pid, 'Marron', 'XXL', 3);
  await insertVariant(pid, 'Blanc', 'XXL', 2);

  // 3. F 30 zip — T-Shirt 3700/2500
  pid = await insertProduct('F 30 zip', 'T-Shirt', 3700, 2500);
  await insertVariant(pid, 'Blanc', 'L', 1);
  await insertVariant(pid, 'Blue', 'L', 1);
  await insertVariant(pid, 'Noir', 'L', 3);
  await insertVariant(pid, 'Noir', 'XL', 1);
  await insertVariant(pid, 'Noir', 'XXL', 2);

  // 4. Ralph — T-Shirt 3700/2500
  pid = await insertProduct('Ralph', 'T-Shirt', 3700, 2500);
  await insertVariant(pid, 'Blanc', 'S', 1);
  await insertVariant(pid, 'Blanc', 'M', 1);
  await insertVariant(pid, 'Blue', 'S', 1);
  await insertVariant(pid, 'Blue', 'L', 1);
  await insertVariant(pid, 'Blue', 'XXL', 1);

  // 5. Amer — T-Shirt 3700/2500
  pid = await insertProduct('Amer', 'T-Shirt', 3700, 2500);
  await insertVariant(pid, 'Marron', 'XXL', 1);
  await insertVariant(pid, 'Olives', 'XXL', 1);
  await insertVariant(pid, 'Blanc', 'XXL', 1);
  await insertVariant(pid, 'Noir', 'XXL', 1);

  // 6. V Neck — T-Shirt 4000/3300
  pid = await insertProduct('V Neck', 'T-Shirt', 4000, 3300);
  await insertVariant(pid, 'Noir', 'XXL', 2);
  await insertVariant(pid, 'Vert', 'XXL', 1);
  await insertVariant(pid, 'Blue', 'XXL', 1);

  // 7. Croco Shoe — Shoes 4500/2900
  pid = await insertProduct('Croco Shoe', 'Shoes', 4500, 2900);
  await insertVariant(pid, 'Noir', '40', 2);
  await insertVariant(pid, 'Noir', '41', 4);
  await insertVariant(pid, 'Noir', '42', 4);
  await insertVariant(pid, 'Noir', '43', 2);

  // 8. Pantalon SNTP — Pants 3700/2500
  pid = await insertProduct('Pantalon SNTP', 'Pants', 3700, 2500);
  await insertVariant(pid, 'Marron', '30', 3);
  await insertVariant(pid, 'Marron', '31', 3);
  await insertVariant(pid, 'Marron', '32', 3);
  await insertVariant(pid, 'Marron', '33', 6);
  await insertVariant(pid, 'Marron', '34', 3);
  await insertVariant(pid, 'Marron', '36', 3);
  await insertVariant(pid, 'Marron', '38', 3);
  await insertVariant(pid, 'Beige', '30', 1);
  await insertVariant(pid, 'Beige', '31', 1);
  await insertVariant(pid, 'Beige', '32', 1);
  await insertVariant(pid, 'Beige', '33', 2);
  await insertVariant(pid, 'Beige', '34', 1);
  await insertVariant(pid, 'Beige', '36', 1);
  await insertVariant(pid, 'Beige', '38', 1);

  // 9. Pantalon Oversize — Pants 4200/3000
  pid = await insertProduct('Pantalon Oversize', 'Pants', 4200, 3000);
  await insertVariant(pid, 'Noir', 'S', 6);
  await insertVariant(pid, 'Noir', 'M', 6);
  await insertVariant(pid, 'Noir', 'L', 6);

  // 10. Chaussure Blanc — Shoes 3500/1900
  pid = await insertProduct('Chaussure Blanc', 'Shoes', 3500, 1900);
  await insertVariant(pid, 'Blanc', '40', 2);
  await insertVariant(pid, 'Blanc', '41', 1);
  await insertVariant(pid, 'Blanc', '42', 1);
  await insertVariant(pid, 'Blanc', '43', 1);

  // 11. Pull SNTP — T-Shirt 3700/2500
  pid = await insertProduct('Pull SNTP', 'T-Shirt', 3700, 2500);
  for (const color of ['Marron', 'Vert', 'Beige']) {
    for (const size of ['S', 'M', 'L', 'XL', 'XXL']) {
      await insertVariant(pid, color, size, 2);
    }
  }

  // 12. F30 9fayl — T-Shirt 3700/2500
  pid = await insertProduct('F30 9fayl', 'T-Shirt', 3700, 2500);
  await insertVariant(pid, 'Blanc', 'M', 1);
  await insertVariant(pid, 'Vert Olive', 'M', 2);
  await insertVariant(pid, 'Blanc', 'L', 8);
  await insertVariant(pid, 'Vert Olive', 'L', 4);
  await insertVariant(pid, 'Noir', 'L', 1);
  await insertVariant(pid, 'Noir', 'XL', 2);
  await insertVariant(pid, 'Vert', 'XL', 2);
  await insertVariant(pid, 'Blanc', 'XL', 2);
  await insertVariant(pid, 'Vert', 'XXL', 2);
  await insertVariant(pid, 'Vert Olive', 'XXL', 2);
  await insertVariant(pid, 'Noir', 'XXL', 2);
  await insertVariant(pid, 'Marron', 'XXL', 1);
  await insertVariant(pid, 'Blanc', 'XXL', 4);

  console.log('Seeded 12 products with all variants.');
}

module.exports = seedIfEmpty;
