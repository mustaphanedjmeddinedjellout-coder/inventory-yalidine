/**
 * Database Connection & Schema Setup
 * Uses @libsql/client for Turso cloud SQLite.
 */

const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./data/inventory.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

/**
 * Initialize all tables.
 */
async function initializeDatabase() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('T-Shirt', 'Pants', 'Shoes')),
      selling_price REAL NOT NULL CHECK(selling_price >= 0),
      cost_price REAL NOT NULL CHECK(cost_price >= 0),
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      color TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      total_amount REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      total_profit REAL NOT NULL DEFAULT 0,
      items_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      firstname TEXT,
      familyname TEXT,
      contact_phone TEXT,
      address TEXT,
      to_wilaya_name TEXT,
      to_commune_name TEXT,
      is_stopdesk INTEGER NOT NULL DEFAULT 0,
      yalidine_tracking TEXT,
      yalidine_status TEXT,
      yalidine_label TEXT,
      yalidine_price REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      variant_info TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      selling_price REAL NOT NULL,
      cost_price REAL NOT NULL,
      line_total REAL NOT NULL,
      line_cost REAL NOT NULL,
      line_profit REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
  `);
}

/**
 * Initialize DB, run migrations, seed if empty
 */
async function setupDatabase() {
  await initializeDatabase();

  // Migrations: add columns if missing
  const colsResult = await db.execute("PRAGMA table_info('orders')");
  const cols = colsResult.rows.map(r => r.name);
  const migrations = [
    ['firstname', 'TEXT'], ['familyname', 'TEXT'], ['contact_phone', 'TEXT'],
    ['address', 'TEXT'], ['to_wilaya_name', 'TEXT'], ['to_commune_name', 'TEXT'],
    ['is_stopdesk', 'INTEGER DEFAULT 0'], ['yalidine_tracking', 'TEXT'],
    ['yalidine_status', 'TEXT'], ['yalidine_label', 'TEXT'], ['yalidine_price', 'REAL'],
  ];
  for (const [name, type] of migrations) {
    if (!cols.includes(name)) {
      await db.execute(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
    }
  }

  // Auto-seed if empty
  const seedIfEmpty = require('./seed');
  await seedIfEmpty(db);

  console.log('Database ready.');
}

module.exports = { db, setupDatabase };
