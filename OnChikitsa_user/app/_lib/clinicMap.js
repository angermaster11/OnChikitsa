'use client';

// Maps backend clinic/appointment shapes onto the card fields the UI already
// speaks (name/cat/area/status/seats/glyph/g/hours…). The backend has no
// ratings or distance yet, so those are simply omitted and the screens render
// what's real. `slotStatus` already arrives lowercase ('active'|'booked'|
// 'closed'), matching the badge + Explore filter keys 1:1.

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOW_LABEL = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Six gradient classes (g1..g6) exist in every screen's CSS module. Pick one
// deterministically from the clinic id so a clinic always wears the same colour.
export function gradientFor(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `g${(h % 6) + 1}`;
}

// Choose an icon key from the clinic's specialty / specification / name.
export function glyphFor(clinic) {
  const hay = `${clinic?.specification || ''} ${(clinic?.specialties || []).join(' ')} ${clinic?.name || ''}`.toLowerCase();
  if (/dent|tooth|orthodont/.test(hay)) return 'tooth';
  if (/cardio|heart/.test(hay)) return 'heart';
  if (/derma|skin|cosmet/.test(hay)) return 'sparkles';
  if (/psych|mental|neuro|mind|brain/.test(hay)) return 'brain';
  if (/lab|diagnostic|patho|test|radiolog/.test(hay)) return 'flask';
  if (/family|general|physician|clinic|polyclinic/.test(hay)) return 'stethoscope';
  return 'building';
}

function hhmmToMin(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "13:05" / "9:0" → "1:05 PM" (12-hour, India-friendly). */
export function to12(hhmm) {
  const mins = hhmmToMin(hhmm);
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** A slot's "9:00 AM – 9:15 AM" label. */
export function slotLabel(slot) {
  return `${to12(slot.start)} – ${to12(slot.end)}`;
}

/** Integer paise → "₹499.00" (India grouping). "—" for null/undefined/NaN. */
export function formatINR(paise) {
  if (paise === undefined || paise === null || Number.isNaN(paise)) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const catOf = (c) => c?.specification || (c?.specialties && c.specialties[0]) || 'Clinic';
const areaOf = (c) => c?.address?.city || c?.address?.formatted || c?.address?.line || '—';

/** Full postal address for the detail screen (falls back to whatever parts exist). */
export function addressLine(addr) {
  if (!addr) return '—';
  if (addr.formatted) return addr.formatted;
  const parts = [addr.line, addr.city, addr.state, addr.pincode].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

/**
 * A one-line opening-hours summary from the clinic-wide weekly schedule, e.g.
 * "Mon–Sat · 9:00 AM – 8:00 PM". The precise per-day windows are the slot
 * picker's job; this is just a friendly hint on the card / detail rows.
 */
export function hoursShort(weekly) {
  if (!weekly) return 'Hours not set';
  const open = DOW.filter((d) => Array.isArray(weekly[d]) && weekly[d].length > 0);
  if (open.length === 0) return 'Hours not set';

  let min = Infinity;
  let max = -Infinity;
  open.forEach((d) => weekly[d].forEach((w) => {
    min = Math.min(min, hhmmToMin(w.start));
    max = Math.max(max, hhmmToMin(w.end));
  }));
  const fmt = (mins) => to12(`${Math.floor(mins / 60)}:${mins % 60}`);
  const span = `${fmt(min)} – ${fmt(max)}`;

  let days;
  if (open.length === 7) {
    days = 'Daily';
  } else {
    const idxs = open.map((d) => DOW.indexOf(d)).sort((a, b) => a - b);
    const contiguous = idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1);
    days = contiguous && idxs.length > 1
      ? `${DOW_LABEL[DOW[idxs[0]]]}–${DOW_LABEL[DOW[idxs[idxs.length - 1]]]}`
      : idxs.map((i) => DOW_LABEL[DOW[i]]).join(', ');
  }
  return `${days} · ${span}`;
}

/** A clinic list item (with doctorsCount/seatsToday/slotStatus) → Explore card. */
export function mapClinicCard(raw) {
  const id = String(raw._id);
  return {
    id,
    name: raw.name,
    cat: catOf(raw),
    area: areaOf(raw),
    status: raw.slotStatus || 'closed',
    seats: raw.seatsToday ?? 0,
    doctorsCount: raw.doctorsCount ?? 0,
    glyph: glyphFor(raw),
    g: gradientFor(id),
  };
}

/** The GET /user/clinics/:id detail payload → the clinic detail view model. */
export function mapClinicDetail(detail) {
  const c = detail.clinic || {};
  const id = String(c._id);
  const today = detail.today || {};
  return {
    id,
    name: c.name,
    cat: catOf(c),
    area: areaOf(c),
    status: today.slotStatus || 'closed',
    seats: today.seats ?? 0,
    glyph: glyphFor(c),
    g: gradientFor(id),
    phone: c.phone1 || '',
    phone2: c.phone2 || '',
    email: c.email || '',
    address: addressLine(c.address),
    hours: hoursShort(c.weeklyHours),
    about: c.description || 'No description provided yet.',
    specialties: c.specialties || [],
    consultationFee: c.consultationFee ?? null,
    doctors: (detail.doctors || []).map((d) => ({ id: String(d._id), name: d.name, specialization: d.specialization })),
    doctorsCount: detail.doctorsCount ?? (detail.doctors || []).length,
  };
}

/** Map a "YYYY-MM-DD" date string to a friendly label ("Today" / "Mon, 6 Oct"). */
export function dateLabel(dateStr) {
  const [y, m, d] = String(dateStr || '').split('-').map(Number);
  if (!y) return dateStr || '';
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((dt - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${DOW_LABEL[DOW[dt.getDay()]]}, ${d} ${MONTHS[dt.getMonth()]}`;
}

const STATUS_LABEL = {
  PENDING_PAYMENT: 'Payment pending',
  BOOKED: 'Confirmed',
  ARRIVED: 'Checked in',
  CONSULTING: 'In consultation',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'Missed',
};

/** A backend appointment doc → the Bookings-screen card shape. */
export function mapBooking(appt) {
  // A CANCELLED row that never got a token (tokenNo 0) is an abandoned/failed
  // payment, not a cancelled confirmed visit — track it as "incomplete".
  const outcome = appt.status === 'CANCELLED'
    ? (appt.tokenNo ? 'cancelled' : 'incomplete')
    : appt.status === 'NO_SHOW' ? 'missed' : 'completed';
  return {
    id: String(appt._id),
    clinicId: String(appt.clinicId || ''),
    clinic: appt.clinicName || 'Clinic',
    area: appt.clinicArea || '',
    date: appt.date,
    dateLabel: dateLabel(appt.date),
    timeLabel: `${to12(appt.slotStart)} – ${to12(appt.slotEnd)}`,
    slotStart: appt.slotStart,
    slotEnd: appt.slotEnd,
    token: appt.tokenNo,
    status: appt.status,
    statusLabel: STATUS_LABEL[appt.status] || appt.status,
    patient: appt.patient?.name || 'You',
    outcome,
    pendingPayment: appt.status === 'PENDING_PAYMENT',
    cancellable: appt.status === 'BOOKED',
    glyph: glyphFor({ name: appt.clinicName }),
    g: gradientFor(String(appt.clinicId || appt.clinicName || appt._id)),
  };
}
