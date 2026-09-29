'use client';

import type { Transaction, PaymentStatus, SettlementStatus, TransactionAppointment } from '@/lib/types';
import { Badge, type BadgeVariant } from '@/components/Badge';
import { formatDate, humanize } from '@/lib/format';

const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
  CREATED: 'neutral',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'warning',
};
const SETTLEMENT_VARIANTS: Record<SettlementStatus, BadgeVariant> = {
  PENDING: 'warning',
  PAID: 'success',
};

export function StatusPill({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_STATUS_VARIANTS[status]}>{humanize(status)}</Badge>;
}

export function SettlementPill({ status }: { status: SettlementStatus }) {
  return <Badge variant={SETTLEMENT_VARIANTS[status]}>{status === 'PAID' ? 'Settled' : 'Pending'}</Badge>;
}

/** The appointment is populated to an object when listed, else an id/null. */
export function apptOf(t: Transaction): TransactionAppointment | null {
  const a = t.appointmentId;
  return a && typeof a === 'object' ? a : null;
}

/** "24 Sep 2026 · 09:00–09:15" from a transaction's populated appointment. */
export function apptLabel(t: Transaction): string {
  const a = apptOf(t);
  if (!a) return '—';
  const d = a.date ? formatDate(a.date) : '';
  const slot = a.slotStart ? `${a.slotStart}${a.slotEnd ? `–${a.slotEnd}` : ''}` : '';
  return [d, slot].filter(Boolean).join(' · ') || '—';
}
