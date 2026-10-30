const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new sqlite3.Database(process.env.MINIDASH_DB_PATH || path.join(dataDir, 'minidash.db'));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}

async function initializeDatabase() {
  await run('PRAGMA foreign_keys = ON');
  await run(`CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cuisine TEXT NOT NULL,
    opening_hours TEXT NOT NULL,
    average_prep_time INTEGER NOT NULL
  )`);
  await run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    delivery_address TEXT NOT NULL,
    scheduled_delivery_time TEXT,
    status TEXT NOT NULL DEFAULT 'PLACED',
    total REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TEXT,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  )`);
  // Upgrade databases created before scheduled_delivery_time was introduced.
  const columns = await all('PRAGMA table_info(orders)');
  if (!columns.some(column => column.name === 'scheduled_delivery_time')) {
    await run('ALTER TABLE orders ADD COLUMN scheduled_delivery_time TEXT');
  }
  if (!columns.some(column => column.name === 'released_at')) {
    await run('ALTER TABLE orders ADD COLUMN released_at TEXT');
  }
  const count = await get('SELECT COUNT(*) AS count FROM restaurants');
  if (count.count === 0) {
    await run('INSERT INTO restaurants (name, cuisine, opening_hours, average_prep_time) VALUES (?, ?, ?, ?)', ['Keta’s Kitchen', 'Soul Food', '11:00 AM - 9:00 PM', 30]);
    await run('INSERT INTO restaurants (name, cuisine, opening_hours, average_prep_time) VALUES (?, ?, ?, ?)', ['Pizza Corner', 'Italian', '10:00 AM - 10:00 PM', 20]);
    await run('INSERT INTO menu_items (restaurant_id, name, price) VALUES (?, ?, ?)', [1, 'Jerk Chicken Plate', 18.50]);
    await run('INSERT INTO menu_items (restaurant_id, name, price) VALUES (?, ?, ?)', [1, 'Fried Fish Plate', 20.00]);
    await run('INSERT INTO menu_items (restaurant_id, name, price) VALUES (?, ?, ?)', [2, 'Cheese Pizza', 14.00]);
  }
}
module.exports = { db, run, get, all, initializeDatabase };
