'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePaginatedList, useDebouncedValue } from '@/lib/useList';
import type { Clinic, ClinicStatus, Permission } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Toolbar, SearchInput } from '@/components/Toolbar';
import { Select, Textarea, Field } from '@/components/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/Badge';
import { Alert, Spinner } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal, ConfirmFooter } from '@/components/Modal';
import { formatDate, formatDateTime, orDash } from '@/lib/format';

const LIMIT = 20;
type ActionType = 'ban' | 'unban' | 'delete' | 'status';
const OPERATIONAL: ClinicStatus[] = ['ACTIVE', 'CLOSED', 'BOOKING_FULL'];

export default function ClinicsPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { items, pagination, loading, error, forbidden, reload } = usePaginatedList<Clinic>('/admin/clinics', {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });

  const [action, setAction] = useState<{ type: ActionType; clinic: Clinic } | null>(null);
  const [reason, setReason] = useState('');
  const [nextStatus, setNextStatus] = useState<ClinicStatus>('ACTIVE');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Clinic | null>(null);

  function openAction(type: ActionType, clinic: Clinic) {
    setAction({ type, clinic });
    setReason('');
    setNextStatus(OPERATIONAL.includes(clinic.status) ? clinic.status : 'ACTIVE');
    setActionError(null);
  }

  async function runAction() {
    if (!action) return;
    setBusy(true);
    setActionError(null);
    try {
      const { type, clinic } = action;
      if (type === 'ban') await api.post(`/admin/clinics/${clinic._id}/ban`, { reason: reason.trim() });
      else if (type === 'unban') await api.post(`/admin/clinics/${clinic._id}/unban`);
      else if (type === 'delete') await api.del(`/admin/clinics/${clinic._id}`);
      else await api.patch(`/admin/clinics/${clinic._id}`, { status: nextStatus });
      setAction(null);
      reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.isForbidden
          ? 'You are not permitted to perform this action.'
          : errorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<Clinic>[] = [
    {
      key: 'name',
      header: 'Clinic',
      render: (c) => (
        <button
          type="button"
          onClick={() => setDetail(c)}
          className="group flex items-center gap-3 text-left"
          title="View clinic details"
        >
          {c.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logo} alt="" className="h-9 w-9 flex-none rounded-full object-cover ring-1 ring-slate-200" />
          ) : (
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
              {c.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span>
            <span className="block font-medium text-slate-900 group-hover:text-brand-700 group-hover:underline">{c.name}</span>
            <span className="block text-xs text-slate-500">{orDash(c.email)}</span>
          </span>
        </button>
      ),
    },
    { key: 'phone', header: 'Phone', render: (c) => <span className="tabular-nums">{c.phone1}</span> },
    {
      key: 'doctors',
      header: 'Doctors',
      render: (c) => <span className="tabular-nums text-slate-700">{c.doctorsCount ?? 0}</span>,
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'created', header: 'Created', render: (c) => formatDate(c.createdAt) },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c) => <RowActions clinic={c} onAction={openAction} can={hasPermission} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Clinics" description="Registered clinics and their operational status." />

      <Toolbar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, phone or email" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-48" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="CLOSED">Closed</option>
          <option value="BOOKING_FULL">Booking full</option>
          <option value="BANNED">Banned</option>
          <option value="DELETED">Deleted</option>
        </Select>
      </Toolbar>

      {forbidden ? (
        <Alert tone="warning">You do not have permission to view clinics.</Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getRowKey={(c) => c._id}
            loading={loading}
            error={error}
            emptyTitle="No clinics found"
            emptyDescription="Try adjusting your search or filters."
          />
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      <ClinicActionModal
        action={action}
        reason={reason}
        setReason={setReason}
        nextStatus={nextStatus}
        setNextStatus={setNextStatus}
        busy={busy}
        error={actionError}
        onCancel={() => setAction(null)}
        onConfirm={runAction}
      />
    </div>
  );
}

function RowActions({
  clinic,
  onAction,
  can,
}: {
  clinic: Clinic;
  onAction: (type: ActionType, clinic: Clinic) => void;
  can: (perm: Permission) => boolean;
}) {
  if (clinic.status === 'DELETED') return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex justify-end gap-1.5">
      <Button size="sm" variant="secondary" disabled={!can('CLINIC_UPDATE')} onClick={() => onAction('status', clinic)}>
        Status
      </Button>
      {clinic.status === 'BANNED' ? (
        <Button size="sm" variant="secondary" disabled={!can('CLINIC_UNBAN')} onClick={() => onAction('unban', clinic)}>
          Unban
        </Button>
      ) : (
        <Button size="sm" variant="secondary" disabled={!can('CLINIC_BAN')} onClick={() => onAction('ban', clinic)}>
          Ban
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={!can('CLINIC_DELETE')} onClick={() => onAction('delete', clinic)}>
        Delete
      </Button>
    </div>
  );
}

function ClinicActionModal({
  action,
  reason,
  setReason,
  nextStatus,
  setNextStatus,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  action: { type: ActionType; clinic: Clinic } | null;
  reason: string;
  setReason: (v: string) => void;
  nextStatus: ClinicStatus;
  setNextStatus: (v: ClinicStatus) => void;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;
  const { type, clinic } = action;
  const config = {
    ban: { title: `Ban ${clinic.name}`, label: 'Ban clinic', variant: 'danger' as const },
    unban: { title: `Unban ${clinic.name}`, label: 'Unban clinic', variant: 'primary' as const },
    delete: { title: `Delete ${clinic.name}`, label: 'Delete clinic', variant: 'danger' as const },
    status: { title: `Update status`, label: 'Save status', variant: 'primary' as const },
  }[type];

  return (
    <Modal
      open
      onClose={onCancel}
      title={config.title}
      size="sm"
      footer={
        <ConfirmFooter
          onCancel={onCancel}
          onConfirm={onConfirm}
          confirmLabel={config.label}
          confirmVariant={config.variant}
          loading={busy}
          disabled={type === 'ban' && reason.trim().length < 3}
        />
      }
    >
      <div className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        {type === 'ban' && (
          <Field label="Reason" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for banning (min 3 characters)" />
          </Field>
        )}
        {type === 'unban' && <p className="text-sm text-slate-600">This restores the clinic to active status.</p>}
        {type === 'delete' && <p className="text-sm text-slate-600">This soft-deletes the clinic. This action is audited.</p>}
        {type === 'status' && (
          <Field label="Operational status" hint="Ban/unban and delete use the dedicated actions.">
            <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as ClinicStatus)}>
              {OPERATIONAL.map((s) => (
                <option key={s} value={s}>
                  {s === 'BOOKING_FULL' ? 'Booking full' : s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
