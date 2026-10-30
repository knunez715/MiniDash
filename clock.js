// Inject { now: () => new Date('2026-11-01T12:00:00Z') } in tests.
const systemClock = { now: () => new Date() };
module.exports = { systemClock };
