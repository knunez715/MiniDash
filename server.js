
const express = require("express");
const db = require("./database");

const app = express();
const PORT = 3000;

// Allow the API to receive JSON data
app.use(express.json());
app.use(express.static("public"));

// Database helper functions
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
}

// Check that IDs are positive integers
function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

// Handle unexpected database errors
function handleError(res, error) {
  console.error(error);
  return res.status(500).json({
    error: "Internal server error"
  });
}

// ============================================
// ENDPOINT 1: GET /restaurants
// List all restaurants
// ============================================

app.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await all(
      "SELECT * FROM restaurants ORDER BY id"
    );

    res.status(200).json(restaurants);
  } catch (error) {
    handleError(res, error);
  }
});

// ============================================
// ENDPOINT 2: GET /restaurants/:id/menu
// Get the menu for a restaurant
// ============================================

app.get("/restaurants/:id/menu", async (req, res) => {
  try {
    const restaurantId = validId(req.params.id);

    if (!restaurantId) {
      return res.status(400).json({
        error: "Invalid restaurant ID"
      });
    }

    const restaurant = await get(
      "SELECT * FROM restaurants WHERE id = ?",
      [restaurantId]
    );

    if (!restaurant) {
      return res.status(404).json({
        error: "Restaurant not found"
      });
    }

    const menu = await all(
      "SELECT id, name, price FROM menu_items WHERE restaurant_id = ?",
      [restaurantId]
    );

    res.status(200).json({
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      menu: menu
    });
  } catch (error) {
    handleError(res, error);
  }
});

// ============================================
// ENDPOINT 3: POST /orders
// Create a new customer order
// ============================================

app.post("/orders", async (req, res) => {
  const { restaurant_id, items, delivery_address } =
    req.body || {};

  const restaurantId = validId(restaurant_id);

  if (
    !restaurantId ||
    !Array.isArray(items) ||
    items.length === 0 ||
    typeof delivery_address !== "string" ||
    !delivery_address.trim()
  ) {
    return res.status(400).json({
      error: "Invalid order information"
    });
  }

  for (const item of items) {
    if (
      !item ||
      !validId(item.menu_item_id) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      return res.status(400).json({
        error: "Invalid menu item ID or quantity"
      });
    }
  }

  try {
    // Keep the order and its items together
    await run("BEGIN IMMEDIATE TRANSACTION");

    const restaurant = await get(
      "SELECT id FROM restaurants WHERE id = ?",
      [restaurantId]
    );

    if (!restaurant) {
      await run("ROLLBACK");
      return res.status(404).json({
        error: "Restaurant not found"
      });
    }

    let totalCents = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await get(
        `SELECT * FROM menu_items
         WHERE id = ? AND restaurant_id = ?`,
        [item.menu_item_id, restaurantId]
      );

      if (!menuItem) {
        await run("ROLLBACK");
        return res.status(400).json({
          error: "Menu item not found at this restaurant"
        });
      }

      const unitPriceCents = Math.round(
        menuItem.price * 100
      );

      totalCents += unitPriceCents * item.quantity;

      if (!Number.isSafeInteger(totalCents)) {
        await run("ROLLBACK");
        return res.status(400).json({
          error: "Order total is too large"
        });
      }

      orderItems.push({
        menu_item_id: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unit_price: unitPriceCents / 100,
        subtotal: (unitPriceCents * item.quantity) / 100
      });
    }

    const total = totalCents / 100;

    const result = await run(
      `INSERT INTO orders
       (restaurant_id, delivery_address, total, status)
       VALUES (?, ?, ?, ?)`,
      [
        restaurantId,
        delivery_address.trim(),
        total,
        "placed"
      ]
    );

    const orderId = result.lastID;

    for (const item of orderItems) {
      await run(
        `INSERT INTO order_items
         (order_id, menu_item_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [
          orderId,
          item.menu_item_id,
          item.quantity,
          item.unit_price
        ]
      );
    }

    await run("COMMIT");

    res.status(201).json({
      message: "Order placed successfully",
      order_id: orderId,
      restaurant_id: restaurantId,
      items: orderItems,
      delivery_address: delivery_address.trim(),
      total: total,
      status: "placed"
    });
  } catch (error) {
    try {
      await run("ROLLBACK");
    } catch (_) {}

    handleError(res, error);
  }
});

// ============================================
// ENDPOINT 4: GET /orders/:id
// Retrieve customer order details
// ============================================

app.get("/orders/:id", async (req, res) => {
  try {
    const orderId = validId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        error: "Invalid order ID"
      });
    }

    const order = await get(
      `SELECT orders.*,
              restaurants.name AS restaurant_name
       FROM orders
       JOIN restaurants
       ON orders.restaurant_id = restaurants.id
       WHERE orders.id = ?`,
      [orderId]
    );

    if (!order) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    const items = await all(
      `SELECT
         order_items.menu_item_id,
         menu_items.name,
         order_items.quantity,
         order_items.unit_price,
         ROUND(
           order_items.quantity * order_items.unit_price,
           2
         ) AS subtotal
       FROM order_items
       JOIN menu_items
       ON order_items.menu_item_id = menu_items.id
       WHERE order_items.order_id = ?`,
      [orderId]
    );

    res.status(200).json({
      ...order,
      items: items
    });
  } catch (error) {
    handleError(res, error);
  }
});

// ============================================
// ENDPOINT 5: PATCH /orders/:id/status
// Update the status of an order
// ============================================

app.patch("/orders/:id/status", async (req, res) => {
  try {
    const orderId = validId(req.params.id);
    const { status } = req.body || {};

    const allowedStatuses = [
      "placed",
      "confirmed",
      "preparing",
      "ready",
      "picked_up",
      "delivered",
      "cancelled"
    ];

    if (!orderId) {
      return res.status(400).json({
        error: "Invalid order ID"
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid order status",
        allowed_statuses: allowedStatuses
      });
    }

    const result = await run(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, orderId]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    res.status(200).json({
      message: "Order status updated successfully",
      order_id: orderId,
      status: status
    });
  } catch (error) {
    handleError(res, error);
  }
});

// Handle endpoints that do not exist
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found"
  });
});

// Handle invalid JSON requests
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      error: "Invalid JSON"
    });
  }

  handleError(res, err);
});

// Start MiniDash server
app.listen(PORT, () => {
  console.log(
    `MiniDash API running at http://localhost:${PORT}`
  );
});
