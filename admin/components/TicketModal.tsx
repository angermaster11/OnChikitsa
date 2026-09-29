'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { SupportTicket, TicketStatus, TicketPriority } from '@/lib/types';
import { Select, Textarea, Field } from '@/components/Input';
import { Alert, Spinner } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { formatDateTime, humanize } from '@/lib/format';

const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'];

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url);
}
function attachmentName(url: string): string {
  try {
    return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '') || 'Attachment';
  } catch {
    return 'Attachment';
  }
}
/** Staff replies sit on the right (the admin's side); the raiser sits on the left. */
function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes((role ?? '').toUpperCase());
}
function initials(name?: string): string {
  const n = (name ?? '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/);
  return (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase();
}

interface ChatMsg {
  id: string;
  name: string;
  role: string;
  message: string;
  createdAt: string;
  mine: boolean;
  attachments?: string[];
}

function FileGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V3a.5.5 0 0 1 .5-.5Z" />
      <path d="M11 2.5V6a.5.5 0 0 0 .5.5H15" />
    </svg>
  );
}

/** One chat bubble — text plus any inline image / file attachments. */
function ChatMessage({ msg }: { msg: ChatMsg }) {
  const images = (msg.attachments ?? []).filter(isImageUrl);
  const files = (msg.attachments ?? []).filter((u) => !isImageUrl(u));
  const hasText = msg.message.trim().length > 0;
  return (
    <div className={`flex items-end gap-2 ${msg.mine ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          msg.mine ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-600'
        }`}
      >
        {initials(msg.name)}
      </div>
      <div className={`flex max-w-[80%] flex-col gap-1 ${msg.mine ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-400">
          <span className="font-medium text-slate-600">{msg.name}</span>
          <span>·</span>
          <span>{humanize(msg.role)}</span>
        </div>
        <div
          className={`overflow-hidden rounded-2xl text-sm shadow-sm ${
            msg.mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800'
          }`}
        >
          {hasText && <p className="whitespace-pre-wrap break-words px-3.5 py-2.5">{msg.message}</p>}
          {images.length > 0 && (
            <div className={`grid gap-1 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${hasText ? 'px-1.5 pb-1.5' : 'p-1.5'}`}>
              {images.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={attachmentName(url)} className="h-32 w-full object-cover transition hover:opacity-90" />
                </a>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className={`space-y-1.5 ${hasText || images.length ? 'px-1.5 pb-1.5' : 'p-1.5'}`}>
              {files.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium ${
                    msg.mine ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileGlyph className="h-4 w-4 shrink-0" />
                  <span className="truncate">{attachmentName(url)}</span>
                </a>
              ))}
            </div>
          )}
        </div>
        <span className="px-1 text-[11px] text-slate-400">{formatDateTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

/** Detail + reply + status/priority modal, shared by the user and clinic queues. */
export function TicketModal({
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
    return () => {
      cancelled = true;
    };
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

  const messages: ChatMsg[] = ticket
    ? [
        {
          id: 'root',
          name: ticket.raisedByName ?? humanize(ticket.raisedByType),
          role: ticket.raisedByType,
          message: ticket.message,
          createdAt: ticket.createdAt,
          mine: false,
          attachments: ticket.attachments ?? [],
        },
        ...ticket.responses.map((r, i) => ({
          id: `r${i}`,
          name: r.authorName,
          role: r.authorRole,
          message: r.message,
          createdAt: r.createdAt,
          mine: isStaffRole(r.authorRole),
        })),
      ]
    : [];

  return (
    <Modal
      open
      onClose={onClose}
      title={ticket?.subject ?? 'Ticket'}
      description={ticket ? humanize(ticket.raisedByType) : undefined}
      size="lg"
    >
      {loadingDetail ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
          <Spinner /> <span className="text-sm">Loading ticket…</span>
        </div>
      ) : loadError ? (
        <Alert tone="error">{loadError}</Alert>
      ) : ticket ? (
        <div className="space-y-4">
          {actionError && <Alert tone="error">{actionError}</Alert>}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              {ticket.raisedByName ?? humanize(ticket.raisedByType)}
            </span>
            {ticket.category && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                {humanize(ticket.category)}
              </span>
            )}
          </div>

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

          <div className="space-y-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conversation</p>
            <div className="space-y-4">
              {messages.map((m) => <ChatMessage key={m.id} msg={m} />)}
            </div>
            {ticket.responses.length === 0 && (
              <p className="text-center text-xs text-slate-400">No replies yet — send the first response below.</p>
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
