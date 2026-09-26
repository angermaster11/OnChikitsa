'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { usePaginatedList, useDebouncedValue } from '@/lib/useList';
import type { SupportTicket, TicketStatus, TicketPriority } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Toolbar, SearchInput } from '@/components/Toolbar';
import { Select, Textarea, Field } from '@/components/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/Badge';
import { Alert, Spinner } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { formatDateTime, humanize } from '@/lib/format';

const LIMIT = 20;
const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export default function SupportPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { items, pagination, loading, error, forbidden, reload } = usePaginatedList<SupportTicket>('/admin/support', {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
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
      key: 'from',
      header: 'Raised by',
      render: (t) => (
        <div>
          <p className="text-slate-700">{t.raisedByName ?? humanize(t.raisedByType)}</p>
          <p className="text-xs text-slate-500">{humanize(t.raisedByType)}</p>
        </div>
      ),
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
      <PageHeader title="Support" description="Tickets raised by users and clinics." />

      <Toolbar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search subject or message" />
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
            emptyTitle="No tickets found"
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
function TicketModal({
  ticketId,
  onClose,
  onChanged,
}: {
  ticketId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reply, setReply] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [statusVal, setStatusVal] = useState<TicketStatus>('OPEN');
  const [priorityVal, setPriorityVal] = useState<TicketPriority>('MEDIUM');
  const [metaBusy, setMetaBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function applyTicket(t: SupportTicket) {
    setTicket(t);
    setStatusVal(t.status);
    setPriorityVal(t.priority);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      setLoadError(null);
      try {
        const t = await api.get<SupportTicket>(`/admin/support/${ticketId}`);
        if (!cancelled) applyTicket(t);
      } catch (err) {
        if (!cancelled) setLoadError(errorMessage(err));
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ticketId]);

  async function refetch() {
    const t = await api.get<SupportTicket>(`/admin/support/${ticketId}`);
    applyTicket(t);
  }

  function toError(err: unknown): string {
    return err instanceof ApiError && err.isForbidden
      ? 'You are not permitted to perform this action.'
      : errorMessage(err);
  }

  async function sendReply() {
    if (reply.trim().length < 1) return;
    setReplyBusy(true);
    setActionError(null);
    try {
      await api.post(`/admin/support/${ticketId}/respond`, { message: reply.trim() });
      setReply('');
      await refetch();
      onChanged();
    } catch (err) {
      setActionError(toError(err));
    } finally {
      setReplyBusy(false);
    }
  }

  async function applyMeta() {
    setMetaBusy(true);
    setActionError(null);
    try {
      await api.patch(`/admin/support/${ticketId}`, { status: statusVal, priority: priorityVal });
      await refetch();
      onChanged();
    } catch (err) {
      setActionError(toError(err));
    } finally {
      setMetaBusy(false);
    }
  }

  const metaDirty = !!ticket && (statusVal !== ticket.status || priorityVal !== ticket.priority);

  return (
    <Modal open onClose={onClose} title={ticket?.subject ?? 'Ticket'} description={ticket ? humanize(ticket.raisedByType) : undefined} size="lg">
      {loadingDetail ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
          <Spinner /> <span className="text-sm">Loading ticket…</span>
        </div>
      ) : loadError ? (
        <Alert tone="error">{loadError}</Alert>
      ) : ticket ? (
        <div className="space-y-4">
          {actionError && <Alert tone="error">{actionError}</Alert>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Status">
              <Select value={statusVal} onChange={(e) => setStatusVal(e.target.value as TicketStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priorityVal} onChange={(e) => setPriorityVal(e.target.value as TicketPriority)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={applyMeta} loading={metaBusy} disabled={!metaDirty}>Apply changes</Button>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conversation</p>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-800">{ticket.message}</p>
              <p className="mt-1 text-xs text-slate-500">
                {ticket.raisedByName ?? humanize(ticket.raisedByType)} · {formatDateTime(ticket.createdAt)}
              </p>
            </div>
            {ticket.responses.map((r, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm text-slate-800">{r.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {r.authorName} · {humanize(r.authorRole)} · {formatDateTime(r.createdAt)}
                </p>
              </div>
            ))}
            {ticket.responses.length === 0 && (
              <p className="text-sm text-slate-400">No replies yet.</p>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <Field label="Reply">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a response to the ticket…" />
            </Field>
            <div className="flex justify-end">
              <Button onClick={sendReply} loading={replyBusy} disabled={reply.trim().length < 1}>Send reply</Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

