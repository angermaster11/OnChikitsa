'use client';

import { useState } from 'react';
import type { AuditLog, Role, TargetType } from '@/lib/types';
import { usePaginatedList } from '@/lib/useList';
import { PageHeader } from '@/components/PageHeader';
import { Toolbar } from '@/components/Toolbar';
import { Select } from '@/components/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/Badge';
import { Alert } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { formatDateTime, humanize, orDash } from '@/lib/format';

const LIMIT = 20;
const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'USER', 'CLINIC'];
const TARGET_TYPES: TargetType[] = ['USER', 'CLINIC', 'DOCTOR', 'ADMIN', 'SUPPORT', 'AUTH'];
const ACTIONS = [
  'AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILED', 'AUTH_LOGOUT',
  'ADMIN_CREATED', 'ADMIN_UPDATED', 'ADMIN_DISABLED',
  'SUPPORT_CREATED', 'SUPPORT_UPDATED', 'SUPPORT_DISABLED',
  'USER_VIEWED', 'USER_UPDATED', 'USER_BANNED', 'USER_UNBANNED', 'USER_DELETED',
  'CLINIC_VIEWED', 'CLINIC_UPDATED', 'CLINIC_BANNED', 'CLINIC_UNBANNED', 'CLINIC_DELETED',
  'DOCTOR_CREATED', 'DOCTOR_UPDATED', 'DOCTOR_DELETED',
  'PASSWORD_CHANGED',
];

export default function AuditLogsPage() {
  const [actorRole, setActorRole] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { items, pagination, loading, error, forbidden } = usePaginatedList<AuditLog>('/admin/audit-logs', {
    page,
    limit: LIMIT,
    actorRole: actorRole || undefined,
    action: action || undefined,
    targetType: targetType || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const [detail, setDetail] = useState<AuditLog | null>(null);

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); };
  }

  const columns: Column<AuditLog>[] = [
    { key: 'time', header: 'When', render: (l) => <span className="whitespace-nowrap">{formatDateTime(l.createdAt)}</span> },
    {
      key: 'actor',
      header: 'Actor',
      render: (l) => (
        <div>
          <p className="font-medium text-slate-900">{l.actorName}</p>
          <p className="text-xs text-slate-500">{humanize(l.actorRole)}</p>
        </div>
      ),
    },
    { key: 'action', header: 'Action', render: (l) => <span className="text-slate-700">{humanize(l.action)}</span> },
    { key: 'target', header: 'Target', render: (l) => <Badge variant="neutral">{humanize(l.targetType)}</Badge> },
    {
      key: 'description',
      header: 'Description',
      render: (l) => <span className="text-slate-600">{orDash(l.description ?? l.targetName)}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (l) => <Button size="sm" variant="ghost" onClick={() => setDetail(l)}>Details</Button>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" description="Immutable record of sensitive actions. Read-only." />

      <Toolbar>
        <Select value={actorRole} onChange={(e) => resetPage(setActorRole)(e.target.value)} className="sm:w-40" aria-label="Filter by actor role">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
        </Select>
        <Select value={action} onChange={(e) => resetPage(setAction)(e.target.value)} className="sm:w-52" aria-label="Filter by action">
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{humanize(a)}</option>)}
        </Select>
        <Select value={targetType} onChange={(e) => resetPage(setTargetType)(e.target.value)} className="sm:w-40" aria-label="Filter by target">
          <option value="">All targets</option>
          {TARGET_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          From
          <input type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} className="input-base h-9 py-1" aria-label="From date" />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          To
          <input type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} className="input-base h-9 py-1" aria-label="To date" />
        </label>
      </Toolbar>

      {forbidden ? (
        <Alert tone="warning">You do not have permission to view audit logs.</Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getRowKey={(l) => l._id}
            loading={loading}
            error={error}
            emptyTitle="No audit records"
            emptyDescription="Try adjusting your filters."
          />
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      <AuditDetailModal log={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
function AuditDetailModal({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  if (!log) return null;
  const rows: Array<[string, string]> = [
    ['When', formatDateTime(log.createdAt)],
    ['Actor', `${log.actorName} (${humanize(log.actorRole)})`],
    ['Actor email', orDash(log.actorEmail)],
    ['Action', humanize(log.action)],
    ['Target type', humanize(log.targetType)],
    ['Target', orDash(log.targetName ?? log.targetId)],
    ['Description', orDash(log.description)],
    ['IP address', orDash(log.ipAddress)],
    ['User agent', orDash(log.userAgent)],
  ];
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
  return (
    <Modal open onClose={onClose} title="Audit record" description={humanize(log.action)} size="md">
      <dl className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-3 gap-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="col-span-2 break-words text-sm text-slate-800">{value}</dd>
          </div>
        ))}
        {hasMetadata && (
          <div className="grid grid-cols-3 gap-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Metadata</dt>
            <dd className="col-span-2">
              <pre className="scroll-slim overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </dd>
          </div>
        )}
      </dl>
    </Modal>
  );
}

