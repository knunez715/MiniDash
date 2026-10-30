const test = require('node:test');
const assert = require('node:assert/strict');
const { parseScheduledTime, isRestaurantOpen } = require('./scheduling');
const now = new Date('2026-11-01T12:00:00Z');
test('45-minute minimum inclusive', () => {
  assert.equal(parseScheduledTime('2026-11-01T12:45:00Z', now).toISOString(), '2026-11-01T12:45:00.000Z');
  assert.throws(() => parseScheduledTime('2026-11-01T12:44:59Z', now), /45 minutes/);
});
test('7-day maximum inclusive', () => {
  assert.ok(parseScheduledTime('2026-11-08T12:00:00Z', now));
  assert.throws(() => parseScheduledTime('2026-11-08T12:00:01Z', now), /7 days/);
});
test('closed restaurant rejects scheduled time', () => {
  assert.equal(isRestaurantOpen('11:00 AM - 9:00 PM', new Date('2026-11-01T15:00:00Z')), false);
  assert.equal(isRestaurantOpen('11:00 AM - 9:00 PM', new Date('2026-11-01T18:00:00Z')), true);
});
test('explicit timezone required', () => {
  assert.throws(() => parseScheduledTime('2026-11-01T18:00:00', now), /UTC offset/);
});

// =======================================
// AUTOMATIC ORDER RELEASE TESTS
// =======================================

const { releaseDueOrders } = require('./scheduling');

// Create a fake database for testing
function createFakeDatabase() {
  const orders = [
    {
      id: 1,
      status: 'SCHEDULED',
      scheduled_delivery_time: '2026-11-01T19:00:00.000Z',
      released_at: null
    }
  ];

  let releaseCount = 0;

  return {
    orders,

    get releaseCount() {
      return releaseCount;
    },

    async run(sql, params) {
      const [releasedAt, releaseCutoff] = params;

      let changes = 0;

      for (const order of orders) {
        if (
          order.status === 'SCHEDULED' &&
          order.scheduled_delivery_time <= releaseCutoff
        ) {
          order.status = 'PLACED';
          order.released_at = releasedAt;
          changes++;
          releaseCount++;
        }
      }

      return { changes };
    }
  };
}

// TEST 5: Order stays scheduled before release time
test('Order remains SCHEDULED before release time', async () => {
  const db = createFakeDatabase();

  const clock = {
    now: () => new Date('2026-11-01T18:29:00.000Z')
  };

  await releaseDueOrders(db, clock);

  assert.strictEqual(db.orders[0].status, 'SCHEDULED');
  assert.strictEqual(db.releaseCount, 0);
});

// TEST 6: Order releases exactly 30 minutes before delivery
test('Order releases 30 minutes before delivery', async () => {
  const db = createFakeDatabase();

  const clock = {
    now: () => new Date('2026-11-01T18:30:00.000Z')
  };

  await releaseDueOrders(db, clock);

  assert.strictEqual(db.orders[0].status, 'PLACED');
  assert.strictEqual(db.releaseCount, 1);
});

// TEST 7: Order cannot be released twice
test('Order is released only once', async () => {
  const db = createFakeDatabase();

  const clock = {
    now: () => new Date('2026-11-01T18:30:00.000Z')
  };

  await releaseDueOrders(db, clock);
  await releaseDueOrders(db, clock);

  assert.strictEqual(db.orders[0].status, 'PLACED');
  assert.strictEqual(db.releaseCount, 1);
});