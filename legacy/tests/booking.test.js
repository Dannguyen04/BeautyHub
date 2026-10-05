const test = require('node:test');
const assert = require('node:assert/strict');
const { slotTaken } = require('../server');

test('prevents double booking for active slots', () => {
  const db = { bookings: [{ id: '1', providerId: 'p1', date: '2026-10-11', time: '14:00', status: 'CONFIRMED' }] };
  assert.equal(slotTaken(db, 'p1', '2026-10-11', '14:00'), true);
  assert.equal(slotTaken(db, 'p1', '2026-10-11', '16:00'), false);
});

test('cancelled slots become available again', () => {
  const db = { bookings: [{ id: '1', providerId: 'p1', date: '2026-10-11', time: '14:00', status: 'CANCELLED' }] };
  assert.equal(slotTaken(db, 'p1', '2026-10-11', '14:00'), false);
});
