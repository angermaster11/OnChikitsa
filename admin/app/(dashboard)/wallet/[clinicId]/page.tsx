'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ClinicWalletDetail, Transaction } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { Alert, PageLoader } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal, ConfirmFooter } from '@/components/Modal';
import { StatusPill, SettlementPill, apptLabel } from '@/components/PaymentBadges';
import { formatCurrency, formatDateTime, orDash } from '@/lib/format';

function BillRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={strong ? 'font-medium text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

export default function ClinicWalletPage() {
  const params = useParams<{ clinicId: string }>();
  const clinicId = params?.clinicId as string;
  const { hasPermission } = useAuth();
  const canSettle = hasPermission('WALLET_SETTLE');

  const [detail, setDetail] = useState<ClinicWalletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [confirmSettle, setConfirmSettle] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setDetail(await api.get<ClinicWalletDetail>(`/admin/wallet/${clinicId}`));
    } catch (err) {
      if (err instanceof ApiError && err.isForbidden) setForbidden(true);
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function settleAll() {
    setSettling(true);
    setSettleError(null);
    try {
      await api.post(`/admin/wallet/${clinicId}/settle`, {});
      setConfirmSettle(false);
      await load();
    } catch (err) {
      setSettleError(
        err instanceof ApiError && err.isForbidden
          ? 'You are not permitted to settle clinics.'
          : errorMessage(err),
      );
    } finally {
      setSettling(false);
    }
  }

  async function markPaid(txId: string) {
    setRowBusy(txId);
    try {
      await api.post(`/admin/transactions/${txId}/settle`, {});
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRowBusy(null);
    }
  }

  const back = (
    <Link href="/wallet">
      <Button variant="secondary" size="sm">Back to wallets</Button>
    </Link>
  );

  if (loading) return <PageLoader label="Loading wallet…" />;
  if (forbidden) {
    return (
      <div className="space-y-5">
        <PageHeader title="Wallet" actions={back} />
        <Alert tone="warning">You do not have permission to view this wallet.</Alert>
      </div>
    );
  }
  if (error || !detail) {
    return (
      <div className="space-y-5">
        <PageHeader title="Wallet" actions={back} />
        <Alert tone="error">{error ?? 'Wallet not found.'}</Alert>
      </div>
    );
  }

  const { wallet, bill, transactions } = detail;

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
    { key: 'appointment', header: 'Appointment', render: (t) => <span className="text-slate-700">{apptLabel(t)}</span> },
    { key: 'amount', header: 'Paid', render: (t) => <span className="tabular-nums">{formatCurrency(t.amountPaise)}</span> },
    {
      key: 'share',
      header: 'Clinic share',
      render: (t) => <span className="tabular-nums font-medium text-slate-900">{formatCurrency(t.settlement.amountPaise)}</span>,
    },
    { key: 'status', header: 'Status', render: (t) => <StatusPill status={t.status} /> },
    {
      key: 'settlement',
      header: 'Settlement',
      render: (t) => (t.status === 'PAID' ? <SettlementPill status={t.settlement.status} /> : <span className="text-slate-400">—</span>),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right print:hidden',
      className: 'text-right print:hidden',
      render: (t) =>
        canSettle && t.status === 'PAID' && t.settlement.status === 'PENDING' ? (
          <Button size="sm" variant="ghost" loading={rowBusy === t._id} onClick={() => void markPaid(t._id)}>
            Mark paid
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={wallet.clinicName || 'Clinic wallet'}
        description="Settlement ledger — the clinic's 90% share collected on its behalf."
        actions={
          <div className="flex items-center gap-2 print:hidden">
            {back}
            <Button variant="secondary" size="sm" onClick={() => window.print()}>Print bill</Button>
            <Button
              size="sm"
              disabled={!canSettle || wallet.pendingPaise <= 0}
              onClick={() => setConfirmSettle(true)}
            >
              Settle all pending
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Bill (paid transactions)</h2>
          <BillRow label="Consultation fees" value={formatCurrency(bill.consultationFeePaise)} />
          <BillRow label="Platform fees" value={formatCurrency(bill.platformFeePaise)} />
          <BillRow label="Commission" value={formatCurrency(bill.commissionPaise)} />
          <BillRow label="GST" value={formatCurrency(bill.gstPaise)} />
          <div className="my-1 border-t border-slate-100" />
          <BillRow label="Platform earning" value={formatCurrency(bill.platformEarningPaise)} strong />
          <BillRow label="Clinic payable (90%)" value={formatCurrency(bill.clinicPayablePaise)} strong />
          <div className="my-1 border-t border-slate-100" />
          <BillRow label="Total collected" value={formatCurrency(bill.totalCollectedPaise)} strong />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Settlement</h2>
          <BillRow label="Pending settlement" value={formatCurrency(wallet.pendingPaise)} strong />
          <BillRow label="Already settled" value={formatCurrency(wallet.settledPaise)} />
          <div className="my-1 border-t border-slate-100" />
          <BillRow label="Paid transactions" value={String(wallet.paidCount)} />
          <BillRow label="Pending transactions" value={String(wallet.pendingCount)} />
          <BillRow label="Settled transactions" value={String(wallet.settledCount)} />
          <div className="my-1 border-t border-slate-100" />
          <BillRow label="Last transaction" value={formatDateTime(wallet.lastTransactionAt)} />
          <BillRow label="Last settled" value={formatDateTime(wallet.lastSettledAt)} />
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Transactions</h2>
        <DataTable
          columns={columns}
          rows={transactions}
          getRowKey={(t) => t._id}
          emptyTitle="No transactions"
          emptyDescription="This clinic has no transactions yet."
        />
      </div>

      {confirmSettle && (
        <Modal
          open
          onClose={() => setConfirmSettle(false)}
          title="Settle all pending"
          description={`Mark every pending transaction for ${wallet.clinicName || 'this clinic'} as settled.`}
          size="sm"
          footer={
            <ConfirmFooter
              onCancel={() => setConfirmSettle(false)}
              onConfirm={settleAll}
              confirmLabel={`Settle ${formatCurrency(wallet.pendingPaise)}`}
              loading={settling}
              disabled={wallet.pendingPaise <= 0}
            />
          }
        >
          <div className="space-y-3">
            {settleError && <Alert tone="error">{settleError}</Alert>}
            <p className="text-sm text-slate-600">
              This records that you have paid the clinic its pending share of{' '}
              <span className="font-semibold text-slate-900">{formatCurrency(wallet.pendingPaise)}</span>{' '}
              offline. It affects bookkeeping only and is audited.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

