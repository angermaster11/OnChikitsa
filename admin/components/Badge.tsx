import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'brand';

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
};

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}

/** Map any known entity status string to a sensible badge color. */
const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  BANNED: 'danger',
  DELETED: 'neutral',
  DISABLED: 'neutral',
  INACTIVE: 'neutral',
  CLOSED: 'warning',
  BOOKING_FULL: 'info',
  // Ticket statuses
  OPEN: 'info',
  PENDING: 'warning',
  RESOLVED: 'success',
  // Ticket priorities
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'danger',
};

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANTS[status] ?? 'neutral'}>{titleCase(status)}</Badge>;
}
