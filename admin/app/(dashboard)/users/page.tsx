'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePaginatedList, useDebouncedValue } from '@/lib/useList';
import type { User, Permission } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Toolbar, SearchInput } from '@/components/Toolbar';
import { Select, Textarea } from '@/components/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/Badge';
import { Alert } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal, ConfirmFooter } from '@/components/Modal';
import { formatDate, orDash } from '@/lib/format';

const LIMIT = 20;
type ActionType = 'ban' | 'unban' | 'delete';

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { items, pagination, loading, error, forbidden, reload } = usePaginatedList<User>('/admin/users', {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });

  const [action, setAction] = useState<{ type: ActionType; user: User } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function openAction(type: ActionType, user: User) {
    setAction({ type, user });
    setReason('');
    setActionError(null);
  }

  async function runAction() {
    if (!action) return;
    setBusy(true);
    setActionError(null);
    try {
      const { type, user } = action;
      if (type === 'ban') await api.post(`/admin/users/${user._id}/ban`, { reason: reason.trim() });
      else if (type === 'unban') await api.post(`/admin/users/${user._id}/unban`);
      else await api.del(`/admin/users/${user._id}`);
      setAction(null);
      reload();
    } catch (err) {
      const msg = err instanceof ApiError && err.isForbidden
        ? 'You are not permitted to perform this action.'
        : errorMessage(err);
      setActionError(msg);
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => (
        <div>
          <Link href={`/users/${u._id}`} className="font-medium text-brand-700 hover:underline">
            {u.name}
          </Link>
          <p className="text-xs text-slate-500">{orDash(u.email)}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (u) => <span className="tabular-nums">{u.phone}</span> },
    { key: 'gender', header: 'Gender', render: (u) => orDash(u.gender) },
    { key: 'onboarding', header: 'Onboarding', render: (u) => <StatusBadge status={u.onboardingStatus ?? 'PENDING'} /> },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
    { key: 'created', header: 'Created', render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (u) => <RowActions user={u} onAction={openAction} can={hasPermission} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Users" description="Patient accounts registered on the platform." />

      <Toolbar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, phone or email" />
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="sm:w-44"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BANNED">Banned</option>
          <option value="DELETED">Deleted</option>
        </Select>
      </Toolbar>

      {forbidden ? (
        <Alert tone="warning">You do not have permission to view users.</Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getRowKey={(u) => u._id}
            loading={loading}
            error={error}
            emptyTitle="No users found"
            emptyDescription="Try adjusting your search or filters."
          />
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      <UserActionModal
        action={action}
        reason={reason}
        setReason={setReason}
        busy={busy}
        error={actionError}
        onCancel={() => setAction(null)}
        onConfirm={runAction}
      />
    </div>
  );
}

function RowActions({
  user,
  onAction,
  can,
}: {
  user: User;
  onAction: (type: ActionType, user: User) => void;
  can: (perm: Permission) => boolean;
}) {
  return (
    <div className="flex justify-end gap-1.5">
      <Link
        href={`/users/${user._id}`}
        className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
      >
        View
      </Link>
      {user.status !== 'DELETED' &&
        (user.status === 'BANNED' ? (
          <Button size="sm" variant="secondary" disabled={!can('USER_UNBAN')} onClick={() => onAction('unban', user)}>
            Unban
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled={!can('USER_BAN')} onClick={() => onAction('ban', user)}>
            Ban
          </Button>
        ))}
      {user.status !== 'DELETED' && (
        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={!can('USER_DELETE')} onClick={() => onAction('delete', user)}>
          Delete
        </Button>
      )}
    </div>
  );
}

function UserActionModal({
  action,
  reason,
  setReason,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  action: { type: ActionType; user: User } | null;
  reason: string;
  setReason: (v: string) => void;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;
  const { type, user } = action;
  const config = {
    ban: { title: `Ban ${user.name}`, label: 'Ban user', variant: 'danger' as const },
    unban: { title: `Unban ${user.name}`, label: 'Unban user', variant: 'primary' as const },
    delete: { title: `Delete ${user.name}`, label: 'Delete user', variant: 'danger' as const },
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
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Reason<span className="ml-0.5 text-red-500">*</span></label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for banning (min 3 characters)" />
          </div>
        )}
        {type === 'unban' && <p className="text-sm text-slate-600">This will restore the user&apos;s access to the platform.</p>}
        {type === 'delete' && <p className="text-sm text-slate-600">This soft-deletes the user. This action is audited.</p>}
      </div>
    </Modal>
  );
}
