const { createClient } = require("@libsql/client");
const db = createClient({
  url: "libsql://inventory-ethereal-virgo-fp.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg3MTYzNTUsImlkIjoiMDE5Yzk2MDgtYTUwMS03ZGUwLTljOTgtYmNhYTc1ODA2ZDhkIiwia2lkIjoiVjlmRE9mTEs4RFVTaDV5RmJnamdONHZLdGJSUzRZV1Z6ZTlDTmdpVmNHTSIsInJpZCI6IjAzODhhMzRiLTVmYWQtNGQ3Zi04OGU3LThhMmZhNTI0Yjg1ZSJ9.el-yFLzqW21AG0JylIoHniAIJUtXrIWn4tbj1SJ4CBXPhtGCKhzbltaPiny3kzms1sbNxgbQ93vqbGnA8n8PBQ"
});
(async () => {
  try {
    // Check if migration is needed
    const s = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'");
    const schema = s.rows[0] ? s.rows[0].sql : "";
    if (schema.includes("Accessories")) {
      console.log("Already has Accessories - no migration needed.");
      return;
    }

    // Count before
    const before = await db.execute("SELECT COUNT(*) as c FROM products");
    console.log("Products before:", before.rows[0].c);

    // Step 1: Rename old table
    console.log("Step 1: Renaming products -> products_backup...");
    await db.execute("ALTER TABLE products RENAME TO products_backup");

    // Step 2: Create new table with Accessories + same column order as the old table
    console.log("Step 2: Creating new products table...");
    await db.execute(`CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('T-Shirt', 'Pants', 'Shoes', 'Accessories')),
      selling_price REAL NOT NULL CHECK(selling_price >= 0),
      cost_price REAL NOT NULL CHECK(cost_price >= 0),
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      promotion_price REAL,
      description TEXT,
      is_hidden INTEGER NOT NULL DEFAULT 0
    )`);

    // Step 3: Copy data using EXPLICIT column names (safe!)
    console.log("Step 3: Copying data with explicit columns...");
    await db.execute(`INSERT INTO products (id, model_name, category, selling_price, cost_price, image, created_at, updated_at, promotion_price, description, is_hidden)
      SELECT id, model_name, category, selling_price, cost_price, image, created_at, updated_at, promotion_price, description, is_hidden
      FROM products_backup`);

    // Step 4: Verify count matches
    const after = await db.execute("SELECT COUNT(*) as c FROM products");
    console.log("Products after:", after.rows[0].c);

    if (Number(before.rows[0].c) !== Number(after.rows[0].c)) {
      console.error("COUNT MISMATCH! Rolling back...");
      await db.execute("DROP TABLE products");
      await db.execute("ALTER TABLE products_backup RENAME TO products");
      console.log("Rolled back.");
      return;
    }

    // Step 5: Drop backup
    console.log("Step 4: Dropping backup...");
    await db.execute("DROP TABLE products_backup");

    // Recreate indexes
    await db.execute("CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id)");

    console.log("\nDONE! All", after.rows[0].c, "products migrated safely.");

    // Final verify
    const schema2 = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'");
    console.log("New schema:", schema2.rows[0].sql);
  } catch(e) {
    console.error("ERROR:", e.message);
    // Try to rollback
    try {
      const backup = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products_backup'");
      if (backup.rows.length > 0) {
        console.log("Rolling back...");
        await db.execute("DROP TABLE IF EXISTS products");
        await db.execute("ALTER TABLE products_backup RENAME TO products");
        console.log("Rolled back successfully.");
      }
    } catch(e2) { console.error("Rollback error:", e2.message); }
  }
})();
