'use client';

import { useState } from 'react';
import { usePaginatedList, useDebouncedValue } from '@/lib/useList';
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Toolbar, SearchInput } from '@/components/Toolbar';
import { Select } from '@/components/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/Badge';
import { Alert } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { TicketModal } from '@/components/TicketModal';
import { formatDateTime, humanize } from '@/lib/format';

const LIMIT = 20;
const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const CATEGORIES: TicketCategory[] = ['PAYMENTS', 'BOOKINGS', 'TECHNICAL', 'OTHER'];

export default function ClinicSupportPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { items, pagination, loading, error, forbidden, reload } = usePaginatedList<SupportTicket>('/admin/support', {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
    category: category || undefined,
    raisedByType: 'CLINIC',
  });

  const [openId, setOpenId] = useState<string | null>(null);

  const columns: Column<SupportTicket>[] = [
    {
      key: 'subject',
      header: 'Subject',
      render: (t) => (
        <div className="max-w-sm">
          <p className="truncate font-medium text-slate-900">{t.subject}</p>
          <p className="truncate text-xs text-slate-500">{t.message}</p>
        </div>
      ),
    },
    {
      key: 'clinic',
      header: 'Clinic',
      render: (t) => <span className="text-slate-700">{t.raisedByName ?? 'Clinic'}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (t) => (t.category ? humanize(t.category) : <span className="text-slate-400">—</span>),
    },
    { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'updated', header: 'Updated', render: (t) => formatDateTime(t.updatedAt) },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (t) => (
        <Button size="sm" variant="secondary" onClick={() => setOpenId(t._id)}>Open</Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Clinic Support" description="Tickets raised by clinics." />

      <Toolbar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search subject or message" />
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Filter by category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
        <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Filter by priority">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
        </Select>
      </Toolbar>

      {forbidden ? (
        <Alert tone="warning">You do not have permission to view support tickets.</Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getRowKey={(t) => t._id}
            loading={loading}
            error={error}
            emptyTitle="No clinic tickets found"
            emptyDescription="Try adjusting your search or filters."
          />
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      {openId && (
        <TicketModal
          ticketId={openId}
          onClose={() => setOpenId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
