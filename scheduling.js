const MIN_AHEAD_MS = 45 * 60_000;
const MAX_AHEAD_MS = 7 * 24 * 60 * 60_000;
const RELEASE_BEFORE_MS = 30 * 60_000;

function parseScheduledTime(value, now) {
  if (value == null) return null;
  // Require an explicit UTC offset to prevent ambiguous local times.
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) {
    throw new Error('scheduled_delivery_time must be an ISO 8601 timestamp with Z or UTC offset');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid scheduled_delivery_time');
  const ahead = date.getTime() - now.getTime();
  if (ahead < MIN_AHEAD_MS || ahead > MAX_AHEAD_MS) {
    throw new Error('Scheduled delivery must be at least 45 minutes and at most 7 days ahead');
  }
  return date;
}

function minutesOfDay(value) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) throw new Error('Invalid restaurant opening_hours configuration');
  const h = Number(match[1]), m = Number(match[2]);
  if (h < 1 || h > 12 || m > 59) throw new Error('Invalid restaurant opening_hours configuration');
  return (h % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + m;
}

function isRestaurantOpen(openingHours, date, timeZone = 'America/New_York') {
  const parts = openingHours.split(/\s+-\s+/);
  if (parts.length !== 2) throw new Error('Invalid restaurant opening_hours configuration');
  const start = minutesOfDay(parts[0]), end = minutesOfDay(parts[1]);
  const localParts = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const h = Number(localParts.find(x => x.type === 'hour').value);
  const m = Number(localParts.find(x => x.type === 'minute').value);
  const current = h * 60 + m;
  if (start === end) return true; // explicitly treat equal times as 24-hour opening
  return start < end ? current >= start && current < end : current >= start || current < end;
}

async function releaseDueOrders(db, clock) {
  const now = clock.now();
  const releaseCutoff = new Date(now.getTime() + RELEASE_BEFORE_MS).toISOString();
  // One atomic conditional UPDATE: only one worker can transition each order.
  return db.run(`UPDATE orders SET status = 'PLACED', released_at = ?
    WHERE status = 'SCHEDULED' AND scheduled_delivery_time <= ?`,
    [now.toISOString(), releaseCutoff]);
}

module.exports = { parseScheduledTime, isRestaurantOpen, releaseDueOrders };
