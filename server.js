const express = require('express');
const db = require('./database');
const { systemClock } = require('./clock');
const { parseScheduledTime, isRestaurantOpen, releaseDueOrders } = require('./scheduling');

const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const transitions = {
  PLACED: ['PREPARING'], PREPARING: ['READY'], READY: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'], DELIVERED: [], CANCELLED: [], SCHEDULED: []
};

function createApp({ clock = systemClock, database = db, timeZone = 'America/New_York' } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static('public'));
  const { run, get, all } = database;

  async function fetchOrder(id) {
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return null;
    order.items = await all(`SELECT oi.menu_item_id AS id, mi.name, oi.quantity,
      oi.unit_price AS price, ROUND(oi.quantity * oi.unit_price, 2) AS subtotal
      FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = ?`, [id]);
    return order;
  }

  // Catch up overdue releases on each request, including after an application restart.
  app.use(wrap(async (req, res, next) => { await releaseDueOrders(database, clock); next(); }));

  app.get('/restaurants', wrap(async (req, res) => {
    res.json(await all('SELECT id, name, cuisine, opening_hours, average_prep_time FROM restaurants'));
  }));
  app.get('/restaurants/:id/menu', wrap(async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid restaurant ID' });
    const restaurant = await get('SELECT id, name FROM restaurants WHERE id = ?', [req.params.id]);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json({ restaurant, items: await all('SELECT id, name, price FROM menu_items WHERE restaurant_id = ?', [req.params.id]) });
  }));

  app.post('/orders', wrap(async (req, res) => {
    const { restaurant_id, items, delivery_address, scheduled_delivery_time = null } = req.body || {};
    if (!validId(restaurant_id) || typeof delivery_address !== 'string' || !delivery_address.trim() ||
      !Array.isArray(items) || !items.length || items.some(item => !item ||
        !validId(item.id ?? item.menu_item_id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
      return res.status(400).json({ error: 'Provide restaurant_id, items [{id, quantity}], and delivery_address' });
    }
    let scheduled;
    try { scheduled = parseScheduledTime(scheduled_delivery_time, clock.now()); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const restaurant = await get('SELECT id, opening_hours FROM restaurants WHERE id = ?', [restaurant_id]);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if (scheduled && !isRestaurantOpen(restaurant.opening_hours, scheduled, timeZone)) {
      return res.status(400).json({ error: 'Restaurant is closed at the scheduled delivery time' });
    }
    const ids = items.map(item => Number(item.id ?? item.menu_item_id));
    if (new Set(ids).size !== ids.length) return res.status(400).json({ error: 'Duplicate menu items are not allowed' });
    const menu = await all(`SELECT id, price FROM menu_items WHERE restaurant_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [restaurant_id, ...ids]);
    if (menu.length !== ids.length) return res.status(400).json({ error: 'One or more items do not belong to this restaurant' });
    const priceById = new Map(menu.map(row => [row.id, row.price]));
    const cents = items.reduce((sum, item) => sum + Math.round(priceById.get(Number(item.id ?? item.menu_item_id)) * 100) * item.quantity, 0);
    if (!Number.isSafeInteger(cents)) return res.status(400).json({ error: 'Order total is too large' });
    await run('BEGIN IMMEDIATE TRANSACTION');
    let orderId;
    try {
      const result = await run(`INSERT INTO orders
        (restaurant_id, delivery_address, scheduled_delivery_time, status, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`, [restaurant_id, delivery_address.trim(), scheduled?.toISOString() || null,
        scheduled ? 'SCHEDULED' : 'PLACED', cents / 100, clock.now().toISOString()]);
      orderId = result.lastID;
      for (const item of items) {
        const id = Number(item.id ?? item.menu_item_id);
        await run('INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [orderId, id, item.quantity, priceById.get(id)]);
      }
      await run('COMMIT');
    } catch (error) { await run('ROLLBACK'); throw error; }
    res.status(201).json(await fetchOrder(orderId));
  }));

  app.get('/orders/:id', wrap(async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid order ID' });
    const order = await fetchOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  }));

  app.patch('/orders/:id/status', wrap(async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid order ID' });
    const { status } = req.body || {};
    if (typeof status !== 'string' || !Object.hasOwn(transitions, status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${Object.keys(transitions).join(', ')}` });
    }
    const order = await get('SELECT status FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!transitions[order.status]?.includes(status)) return res.status(409).json({ error: `Cannot change ${order.status} to ${status}` });
    const result = await run('UPDATE orders SET status = ? WHERE id = ? AND status = ?', [status, req.params.id, order.status]);
    if (!result.changes) return res.status(409).json({ error: 'Order status changed concurrently; retry' });
    res.json(await fetchOrder(req.params.id));
  }));

  // Customer cancellation is distinct from restaurant/driver status changes.
  app.post('/orders/:id/cancel', wrap(async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid order ID' });
    const order = await get('SELECT id, status, scheduled_delivery_time FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'SCHEDULED' || !order.scheduled_delivery_time ||
      new Date(order.scheduled_delivery_time).getTime() - clock.now().getTime() <= 30 * 60_000) {
      return res.status(409).json({ error: 'Only unreleased scheduled orders can be cancelled' });
    }
    const result = await run(`UPDATE orders SET status = 'CANCELLED' WHERE id = ? AND status = 'SCHEDULED'`, [req.params.id]);
    if (!result.changes) return res.status(409).json({ error: 'Order already released or cancelled' });
    res.json(await fetchOrder(req.params.id));
  }));

  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Invalid JSON body' });
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

async function start({ clock = systemClock, database = db, port = process.env.PORT || 3000 } = {}) {
  await database.initializeDatabase();
  const app = createApp({ clock, database });
  const server = app.listen(port, () => console.log(`MiniDash running at http://localhost:${port}`));
  // Release on a timer as well as on incoming requests. SQL guards exactly-once transitions.
  const timer = setInterval(() => releaseDueOrders(database, clock).catch(console.error), 1000);
  server.on('close', () => clearInterval(timer));
  return server;
}
if (require.main === module) start().catch(error => { console.error(error); process.exit(1); });
module.exports = { createApp, start };
