/**
 * Slot maths for patient booking. Pure, side-effect-free helpers that turn a
 * clinic's weekly opening windows + slot rules into concrete bookable slots for
 * a given calendar day. Times are 24-hour "HH:MM" and dates are "YYYY-MM-DD",
 * both interpreted in the SERVER's local timezone (the app is single-region);
 * this is the one place that assumption lives, so a future tz-aware version only
 * touches this file.
 */
import type { WeeklyHours, DayWindow, SlotConfiguration } from '../clinics/clinic.model';

/** JS Date.getDay() (0=Sun) → the weekday key used on Clinic.weeklyHours. */
export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDateStr(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export const hhmmToMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const minToHhmm = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Weekday key for a "YYYY-MM-DD" date, at local midnight. */
export function weekdayKeyOf(dateStr: string): WeekdayKey {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEKDAY_KEYS[new Date(y, m - 1, d).getDay()];
}

/** Local "today" as "YYYY-MM-DD". */
export function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** Whole days from local today to `dateStr` (negative = past, 0 = today). */
export function daysFromToday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86_400_000);
}

/** Add `days` to a "YYYY-MM-DD" date, returning another "YYYY-MM-DD" (local). */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/** Minutes since local midnight, right now. */
export function nowMinutes(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export interface GeneratedSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

/**
 * Chop the given open windows into consecutive slots of `slotDurationMin`, each
 * followed by `breakMin` of buffer. A slot is kept only if it fits entirely
 * inside its window. Windows are processed in time order and duplicate start
 * times (from overlapping windows) are dropped.
 */
export function generateSlots(
  windows: DayWindow[] | undefined,
  slotDurationMin: number,
  breakMin: number,
): GeneratedSlot[] {
  if (!windows || windows.length === 0 || slotDurationMin <= 0) return [];
  const step = slotDurationMin + Math.max(0, breakMin);
  const seen = new Set<number>();
  const out: GeneratedSlot[] = [];
  const ordered = [...windows].sort((a, b) => a.start.localeCompare(b.start));
  for (const w of ordered) {
    if (!HHMM_RE.test(w.start) || !HHMM_RE.test(w.end)) continue;
    const wStart = hhmmToMin(w.start);
    const wEnd = hhmmToMin(w.end);
    for (let t = wStart; t + slotDurationMin <= wEnd; t += step) {
      if (seen.has(t)) continue;
      seen.add(t);
      out.push({ start: minToHhmm(t), end: minToHhmm(t + slotDurationMin) });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** The open windows for a given date's weekday (empty array = closed that day). */
export function windowsForDate(weekly: WeeklyHours | undefined, dateStr: string): DayWindow[] {
  if (!weekly) return [];
  const key = weekdayKeyOf(dateStr);
  const w = weekly[key];
  return Array.isArray(w) ? w : [];
}

/** Effective slot rules with the app's documented fallbacks applied. */
export interface EffectiveSlotConfig {
  slotDurationMin: number;
  breakBetweenSlotsMin: number;
  maxPatientsPerSlot: number;
  advanceBookingDays: number;
  sameDayBooking: boolean;
  bookingEnabled: boolean;
}
export function effectiveConfig(c: SlotConfiguration | undefined): EffectiveSlotConfig {
  return {
    slotDurationMin: c?.slotDurationMin ?? 15,
    breakBetweenSlotsMin: c?.breakBetweenSlotsMin ?? 5,
    maxPatientsPerSlot: c?.maxPatientsPerSlot ?? 1,
    advanceBookingDays: c?.advanceBookingDays ?? 14,
    sameDayBooking: c?.sameDayBooking ?? true,
    bookingEnabled: c?.bookingEnabled ?? true,
  };
}
