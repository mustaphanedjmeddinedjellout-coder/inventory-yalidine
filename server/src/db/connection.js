/**
 * Database Connection & Schema Setup
 * Uses better-sqlite3 for synchronous, fast SQLite operations.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const DB_PATH = process.env.DB_PATH || './data/inventory.db';
const absolutePath = path.resolve(__dirname, '..', '..', DB_PATH);

// Ensure directory exists
const dir = path.dirname(absolutePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(absolutePath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize all tables.
 * - products: stores core product info including cost_price
 * - product_variants: stores color/size/quantity per product
 * - orders: stores order header with totals
 * - order_items: stores line items with price snapshots
 */
function initializeDatabase() {
  db.exec(`
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
      -- Customer / shipping info
      firstname TEXT,
      familyname TEXT,
      contact_phone TEXT,
      address TEXT,
      to_wilaya_name TEXT,
      to_commune_name TEXT,
      is_stopdesk INTEGER NOT NULL DEFAULT 0,
      -- Yalidine tracking
      yalidine_tracking TEXT,
      yalidine_status TEXT,
      yalidine_label TEXT,
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

    -- Indexes for performance on analytics queries
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
  `);
}

initializeDatabase();

/**
 * Migrations – safely add columns for Yalidine integration
 * if they don't already exist (for existing databases).
 */
function runMigrations() {
  const cols = db.prepare("PRAGMA table_info('orders')").all().map(c => c.name);
  const addCol = (name, type) => {
    if (!cols.includes(name)) {
      db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
    }
  };
  addCol('firstname', 'TEXT');
  addCol('familyname', 'TEXT');
  addCol('contact_phone', 'TEXT');
  addCol('address', 'TEXT');
  addCol('to_wilaya_name', 'TEXT');
  addCol('to_commune_name', 'TEXT');
  addCol('is_stopdesk', 'INTEGER DEFAULT 0');
  addCol('yalidine_tracking', 'TEXT');
  addCol('yalidine_status', 'TEXT');
  addCol('yalidine_label', 'TEXT');
  addCol('yalidine_price', 'REAL');
}
runMigrations();

module.exports = db;
