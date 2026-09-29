'use client';

import { useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePaginatedList, useDebouncedValue } from '@/lib/useList';
import type { Transaction } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Toolbar, SearchInput } from '@/components/Toolbar';
import { Select } from '@/components/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Alert } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal, ConfirmFooter } from '@/components/Modal';
import { StatusPill, SettlementPill, apptOf, apptLabel } from '@/components/PaymentBadges';
import { formatCurrency, formatDateTime, humanize, orDash } from '@/lib/format';

const LIMIT = 20;

export default function TransactionsPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [settlement, setSettlement] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { items, pagination, loading, error, forbidden, reload } = usePaginatedList<Transaction>(
    '/admin/transactions',
    {
      page,
      limit: LIMIT,
      search: debouncedSearch || undefined,
      status: status || undefined,
      settlementStatus: settlement || undefined,
    },
  );

  const [view, setView] = useState<Transaction | null>(null);
  const canSettle = hasPermission('WALLET_SETTLE');

  const columns: Column<Transaction>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (t) => (
        <div>
          <p className="text-slate-900">{orDash(t.contact?.name)}</p>
          <p className="tabular-nums text-[11px] text-slate-500">{orDash(t.contact?.phone)}</p>
        </div>
      ),
    },
    { key: 'clinic', header: 'Clinic', render: (t) => <span className="text-slate-800">{orDash(t.clinicName)}</span> },
    { key: 'appointment', header: 'Appointment', render: (t) => <span className="text-slate-700">{apptLabel(t)}</span> },
    {
      key: 'amount',
      header: 'Amount',
      render: (t) => <span className="tabular-nums font-medium text-slate-900">{formatCurrency(t.amountPaise)}</span>,
    },
    { key: 'txn', header: 'Order id', render: (t) => <span className="font-mono text-[11px] text-slate-500 break-all">{t.razorpayOrderId ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusPill status={t.status} /> },
    {
      key: 'settlement',
      header: 'Settlement',
      render: (t) => (t.status === 'PAID' ? <SettlementPill status={t.settlement.status} /> : <span className="text-slate-400">—</span>),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (t) => (
        <Button size="sm" variant="ghost" onClick={() => setView(t)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        description="Every patient payment collected through Razorpay. The platform holds the funds and settles each clinic's share from the Wallet."
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search txn id, clinic or patient"
        />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="CREATED">Created</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </Select>
        <Select value={settlement} onChange={(e) => { setSettlement(e.target.value); setPage(1); }} className="sm:w-44" aria-label="Filter by settlement">
          <option value="">All settlements</option>
          <option value="PENDING">Pending settlement</option>
          <option value="PAID">Settled</option>
        </Select>
      </Toolbar>

      {forbidden ? (
        <Alert tone="warning">You do not have permission to view transactions.</Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getRowKey={(t) => t._id}
            loading={loading}
            error={error}
            emptyTitle="No transactions found"
            emptyDescription="Transactions appear here once patients pay for bookings."
          />
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      {view && (
        <TransactionDetailModal
          transaction={view}
          canSettle={canSettle}
          onClose={() => setView(null)}
          onSettled={() => { setView(null); reload(); }}
        />
      )}
    </div>
  );
}

function BreakdownRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={strong ? 'font-medium text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

function TransactionDetailModal({
  transaction,
  canSettle,
  onClose,
  onSettled,
}: {
  transaction: Transaction;
  canSettle: boolean;
  onClose: () => void;
  onSettled: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const b = transaction.breakdown;
  const appt = apptOf(transaction);
  const canMarkPaid =
    canSettle && transaction.status === 'PAID' && transaction.settlement.status === 'PENDING';

  async function settle() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/transactions/${transaction._id}/settle`, {});
      onSettled();
    } catch (err) {
      setError(
        err instanceof ApiError && err.isForbidden
          ? 'You are not permitted to settle transactions.'
          : errorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Transaction detail"
      description={transaction.razorpayOrderId ?? transaction._id}
      size="md"
      footer={
        confirming ? (
          <ConfirmFooter
            onCancel={() => setConfirming(false)}
            onConfirm={settle}
            confirmLabel="Confirm — mark settled"
            loading={busy}
          />
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {canMarkPaid && <Button onClick={() => setConfirming(true)}>Mark settled</Button>}
          </>
        )
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={transaction.status} />
          {transaction.status === 'PAID' && <SettlementPill status={transaction.settlement.status} />}
          <span className="text-xs text-slate-500">{formatDateTime(transaction.createdAt)}</span>
          {transaction.paidAt && <span className="text-xs text-slate-500">· Paid {formatDateTime(transaction.paidAt)}</span>}
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <BreakdownRow label="Consultation fee" value={formatCurrency(b.consultationFeePaise)} />
          <BreakdownRow label="Platform fee" value={formatCurrency(b.platformFeePaise)} />
          <BreakdownRow label={`Commission (${b.commissionPercent}%)`} value={formatCurrency(b.commissionPaise)} />
          <BreakdownRow label={`GST (${b.gstRate}% on ${humanize(b.gstBase)})`} value={formatCurrency(b.gstPaise)} />
          <div className="my-1 border-t border-slate-100" />
          <BreakdownRow label="Total paid by patient" value={formatCurrency(b.totalPaise)} strong />
          <div className="my-1 border-t border-slate-100" />
          <BreakdownRow label="→ Clinic payable (90%)" value={formatCurrency(b.clinicAmountPaise)} />
          <BreakdownRow label="→ Platform earning" value={formatCurrency(b.platformAmountPaise)} />
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Patient</dt>
            <dd className="text-slate-800">
              {orDash(transaction.contact?.name)}
              {transaction.contact?.phone ? ` · ${transaction.contact.phone}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Clinic</dt>
            <dd className="text-slate-800">{orDash(transaction.clinicName)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Appointment</dt>
            <dd className="text-slate-800">
              {appt ? apptLabel(transaction) : '—'}
              {appt?.tokenNo != null ? ` · Token ${appt.tokenNo}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Razorpay payment id</dt>
            <dd className="font-mono text-xs text-slate-800 break-all">{orDash(transaction.razorpayPaymentId)}</dd>
          </div>
          {transaction.settlement.status === 'PAID' && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Settled</dt>
              <dd className="text-slate-800">{formatDateTime(transaction.settlement.settledAt)}</dd>
            </div>
          )}
        </dl>
      </div>
    </Modal>
  );
}


