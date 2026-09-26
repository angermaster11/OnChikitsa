'use client';

// Bookings shown on the Bookings screen. No booking backend yet, so this mixes
// the user's own bookings (saved to flow when they confirm on the clinic screen)
// with a little demo data so the Live/Past tabs are never empty.
//
// A LIVE booking mimics a real clinic queue: `queueNo` is your token, `currentNo`
// is the token the clinic is serving right now, `timing` is your booked slot and
// `expected` is when you're likely to be seen. PAST bookings carry an `outcome`.
import { flow } from './flow';

const DEMO_LIVE = [
  {
    id: 'lb1', clinic: 'CityCare Multispeciality', cat: 'Multispeciality',
    area: 'Sector 18, Noida', g: 'g1', glyph: 'building', patient: 'You',
    date: 'Today', timing: '2:30 PM', expected: '2:55 PM', queueNo: 18, currentNo: 14,
  },
];

const DEMO_PAST = [
  { id: 'pb1', clinic: 'Aarogya Dental Studio', cat: 'Dental', area: 'Sector 62, Noida', g: 'g2', glyph: 'tooth', patient: 'You', date: '18 Sep 2026', timing: '11:00 AM', outcome: 'completed' },
  { id: 'pb2', clinic: 'LifeLine Diagnostics', cat: 'Lab & Diagnostics', area: 'Atta Market, Noida', g: 'g3', glyph: 'flask', patient: 'You', date: '9 Sep 2026', timing: '8:15 AM', outcome: 'completed' },
  { id: 'pb3', clinic: 'Dr. Aisha Rao', cat: 'Cardiologist', area: 'MG Road, Noida', g: 'g5', glyph: 'heart', patient: 'You', date: '2 Sep 2026', timing: '5:00 PM', outcome: 'cancelled' },
];

export function getLiveBookings() {
  const mine = flow.getBookings().filter((b) => b.status === 'live');
  return [...mine, ...DEMO_LIVE];
}

export function getPastBookings() {
  const mine = flow.getBookings().filter((b) => b.status && b.status !== 'live');
  return [...mine, ...DEMO_PAST];
}

// Turn a live booking's queue numbers into a friendly status. People ahead of you
// is your token minus the one being served; ~5 min per patient is a rough wait.
export function queueStatus(b) {
  const ahead = Math.max(0, (b.queueNo || 0) - (b.currentNo || 0));
  if (ahead <= 0) return { label: 'Your turn now', ahead, wait: 0, soon: true };
  if (ahead <= 2) return { label: 'Almost your turn', ahead, wait: ahead * 5, soon: true };
  return { label: 'In queue', ahead, wait: ahead * 5, soon: false };
}
