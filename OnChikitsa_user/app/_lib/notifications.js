'use client';

// Notifications shown when the user taps the dashboard bell. No push backend yet,
// so this generates the list on the client: live entries are derived from the
// user's real live bookings (queue position), followed by a little demo history.
// Each item carries an `unread` baseline; the screen crosses it with the read ids
// stored in flow so the bell's dot and this list agree.
import { getLiveBookings } from './bookings';
import { flow } from './flow';

const TYPES = {
  reminder: { g: 'blue' },   // appointment / queue reminders
  booking: { g: 'green' },   // booking status updates
  health: { g: 'amber' },    // tips, offers, health alerts
};

// Static demo history — always present so the screen is never empty.
const DEMO = [
  { id: 'nd-offer', type: 'health', title: 'Free health check-up camp', body: 'CityCare Multispeciality is hosting a free check-up this weekend. Tap to know more.', time: '1d ago', unread: true },
  { id: 'nd-done', type: 'booking', title: 'Visit completed', body: 'Your appointment at Aarogya Dental Studio is marked completed. Rate your visit.', time: '3d ago', unread: false },
  { id: 'nd-welcome', type: 'health', title: 'Welcome to OnChikitsa', body: 'Book clinics near you and skip the waiting-room queue.', time: '5d ago', unread: false },
];

// Turn each live booking into a "your queue is moving" reminder.
function liveNotifs() {
  return getLiveBookings().map((b) => {
    const ahead = Math.max(0, (b.queueNo || 0) - (b.currentNo || 0));
    return {
      id: `nb-${b.id}`,
      type: 'reminder',
      title: ahead <= 0 ? 'It’s your turn now' : `You’re ${ahead} away in the queue`,
      body: `${b.clinic} · now serving #${b.currentNo}, your token is #${b.queueNo}.`,
      time: 'Just now',
      unread: true,
    };
  });
}

// Full list, newest first, with `unread` reduced by whatever the user has seen.
export function getNotifications() {
  const read = new Set(flow.getReadNotifs());
  return [...liveNotifs(), ...DEMO].map((n) => ({
    ...n,
    tone: (TYPES[n.type] || TYPES.health).g,
    unread: n.unread && !read.has(n.id),
  }));
}

export function unreadCount() {
  return getNotifications().filter((n) => n.unread).length;
}
