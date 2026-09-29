'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { WalletClinic } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { Alert } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/format';

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'emerald' }) {
  const valueColor = tone === 'amber' ? 'text-amber-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-900';
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
    </Card>
  );
}

export default function WalletPage() {
  const [wallets, setWallets] = useState<WalletClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setWallets(await api.get<WalletClinic[]>('/admin/wallet'));
    } catch (err) {
      if (err instanceof ApiError && err.isForbidden) setForbidden(true);
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = wallets.reduce(
    (acc, w) => ({
      collected: acc.collected + w.totalCollectedPaise,
      pending: acc.pending + w.pendingPaise,
      settled: acc.settled + w.settledPaise,
    }),
    { collected: 0, pending: 0, settled: 0 },
  );

  const columns: Column<WalletClinic>[] = [
    {
      key: 'clinic',
      header: 'Clinic',
      render: (w) => (
        <Link href={`/wallet/${w.clinicId}`} className="font-medium text-brand-600 hover:underline">
          {w.clinicName || 'Clinic'}
        </Link>
      ),
    },
    { key: 'collected', header: 'Collected', render: (w) => <span className="tabular-nums">{formatCurrency(w.totalCollectedPaise)}</span> },
    { key: 'payable', header: 'Clinic payable', render: (w) => <span className="tabular-nums">{formatCurrency(w.clinicPayablePaise)}</span> },
    {
      key: 'pending',
      header: 'Pending',
      render: (w) => (
        <span className={`tabular-nums font-medium ${w.pendingPaise > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
          {formatCurrency(w.pendingPaise)}
        </span>
      ),
    },
    { key: 'settled', header: 'Settled', render: (w) => <span className="tabular-nums text-emerald-700">{formatCurrency(w.settledPaise)}</span> },
    {
      key: 'counts',
      header: 'Transactions',
      render: (w) => (
        <span className="text-xs text-slate-500">
          <span className="tabular-nums text-slate-700">{w.paidCount}</span> paid ·{' '}
          <span className="tabular-nums">{w.pendingCount}</span> pending
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (w) => (
        <Link href={`/wallet/${w.clinicId}`}>
          <Button size="sm" variant="ghost">Open</Button>
        </Link>
      ),
    },
  ];

  let body: ReactNode;
  if (forbidden) {
    body = <Alert tone="warning">You do not have permission to view wallets.</Alert>;
  } else {
    body = (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total collected" value={formatCurrency(totals.collected)} />
          <StatCard label="Pending settlement" value={formatCurrency(totals.pending)} tone="amber" />
          <StatCard label="Settled to clinics" value={formatCurrency(totals.settled)} tone="emerald" />
        </div>
        <DataTable
          columns={columns}
          rows={wallets}
          getRowKey={(w) => w.clinicId}
          loading={loading}
          error={error}
          emptyTitle="No wallets yet"
          emptyDescription="A clinic wallet appears here after its first paid booking."
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Wallet"
        description="Per-clinic settlement ledger. The platform collects every payment and settles each clinic's 90% share offline."
      />
      {body}
    </div>
  );
}
