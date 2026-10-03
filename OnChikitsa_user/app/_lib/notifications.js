'use client';

// The bell / notification list, built from the user's REAL bookings. There is no
// push backend yet, so this derives honest, actionable items from the appointments
// the app already fetches (bookingApi.listMine → mapBooking): a reminder for each
// upcoming visit and a "rate your visit" prompt for each completed one. Pure — the
// caller passes the mapped bookings so the dashboard bell and the alerts list agree.
// Each item's `unread` baseline is crossed with the read ids stored in flow.
import { flow } from './flow';

const TONES = { reminder: 'blue', booking: 'green', health: 'amber' };
const UPCOMING = ['PENDING_PAYMENT', 'BOOKED', 'ARRIVED', 'CONSULTING'];

function itemsFor(bookings) {
  const out = [];
  for (const b of bookings || []) {
    if (b.outcome === 'completed') {
      out.push({
        id: `nb-done-${b.id}`,
        type: 'booking',
        title: `Visit completed at ${b.clinic}`,
        body: 'Tap to rate your visit and share feedback.',
        time: b.dateLabel || b.date || '',
        unread: true,
      });
    } else if (UPCOMING.includes(b.status)) {
      const when = [b.dateLabel || b.date, b.timeLabel].filter(Boolean).join(' · ');
      out.push({
        id: `nb-up-${b.id}`,
        type: 'reminder',
        title: `Upcoming appointment at ${b.clinic}`,
        body: `${when}${b.token ? ` · token #${b.token}` : ''}.`,
        time: b.dateLabel || '',
        unread: true,
      });
    }
  }
  return out;
}

/** Build the notification list from the user's real bookings, applying read state. */
export function buildNotifications(bookings) {
  const read = new Set(flow.getReadNotifs());
  return itemsFor(bookings).map((n) => ({
    ...n,
    tone: TONES[n.type] || TONES.health,
    unread: n.unread && !read.has(n.id),
  }));
}

/** Count of still-unread notifications derived from the given bookings. */
export function unreadCountFrom(bookings) {
  return buildNotifications(bookings).filter((n) => n.unread).length;
}
