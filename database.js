
const sqlite3 = require("sqlite3").verbose();

// Connect to SQLite database
const db = new sqlite3.Database("./minidash.db", (err) => {
  if (err) {
    console.error("Database error:", err.message);
  } else {
    console.log("Connected to MiniDash SQLite database.");
  }
});

// Create database tables
db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  // Restaurants table
  db.run(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cuisine TEXT NOT NULL,
      opening_hours TEXT NOT NULL,
      avg_prep_time INTEGER NOT NULL
    )
  `);

  // Menu items table
  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL,
      delivery_address TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'placed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
    )
  `);

  // Order items table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY (order_id)
        REFERENCES orders(id),
      FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id)
    )
  `);

  // Add sample restaurants if database is empty
  db.get("SELECT COUNT(*) AS count FROM restaurants", (err, row) => {
    if (err) {
      console.error("Database query error:", err.message);
      return;
    }

    if (row.count === 0) {
      db.run(`
        INSERT INTO restaurants
          (name, cuisine, opening_hours, avg_prep_time)
        VALUES
          ('Pizza Palace', 'Italian', '10:00-22:00', 25),
          ('Sushi House', 'Japanese', '11:00-21:00', 30),
          ('Burger Spot', 'American', '09:00-23:00', 15)
      `, (err) => {
        if (err) {
          console.error("Error inserting restaurants:", err.message);
          return;
        }

        // Add sample menu items
        db.run(`
          INSERT INTO menu_items
            (restaurant_id, name, price)
          VALUES
            (1, 'Margherita Pizza', 12.99),
            (1, 'Pepperoni Pizza', 14.99),
            (1, 'Garlic Bread', 5.99),
            (2, 'California Roll', 8.99),
            (2, 'Salmon Sushi', 12.99),
            (3, 'Cheeseburger', 10.99),
            (3, 'French Fries', 4.99)
        `, (err) => {
          if (err) {
            console.error("Error inserting menu:", err.message);
          } else {
            console.log("Sample restaurant and menu data added.");
          }
        });
      });
    }
  });
});

// Export database for use in server.js
module.exports = db;
