'use client';

import { useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePaginatedList, useDebouncedValue } from '@/lib/useList';
import type { Faq } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Toolbar, SearchInput } from '@/components/Toolbar';
import { Select, Input, Textarea, Field } from '@/components/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/Badge';
import { Alert } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal, ConfirmFooter } from '@/components/Modal';
import { PlusIcon } from '@/components/Icons';
import { formatDate } from '@/lib/format';

const LIMIT = 20;

interface FaqForm {
  question: string;
  answer: string;
  order: string;
  isActive: boolean;
}

const EMPTY_FORM: FaqForm = { question: '', answer: '', order: '0', isActive: true };

export default function FaqsPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { items, pagination, loading, error, forbidden, reload } = usePaginatedList<Faq>('/admin/faqs', {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    isActive: active || undefined,
  });

  const [view, setView] = useState<Faq | null>(null);
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; faq?: Faq } | null>(null);
  const [toDelete, setToDelete] = useState<Faq | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    setDelBusy(true);
    setDelError(null);
    try {
      await api.del(`/admin/faqs/${toDelete._id}`);
      setToDelete(null);
      reload();
    } catch (err) {
      setDelError(
        err instanceof ApiError && err.isForbidden
          ? 'You are not permitted to perform this action.'
          : errorMessage(err),
      );
    } finally {
      setDelBusy(false);
    }
  }
  const columns: Column<Faq>[] = [
    {
      key: 'question',
      header: 'Question',
      render: (f) => (
        <div className="max-w-md">
          <p className="font-medium text-slate-900">{f.question}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{f.answer}</p>
        </div>
      ),
    },
    { key: 'order', header: 'Order', render: (f) => <span className="tabular-nums">{f.order}</span> },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'created', header: 'Created', render: (f) => formatDate(f.createdAt) },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (f) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setView(f)}>View</Button>
          <Button size="sm" variant="secondary" disabled={!hasPermission('FAQ_UPDATE')} onClick={() => setForm({ mode: 'edit', faq: f })}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={!hasPermission('FAQ_DELETE')} onClick={() => setToDelete(f)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];
  return (
    <div className="space-y-5">
      <PageHeader
        title="FAQs"
        description="Frequently asked questions shown in the app's Support screen."
        actions={
          <Button disabled={!hasPermission('FAQ_CREATE')} onClick={() => setForm({ mode: 'create' })}>
            <PlusIcon className="h-4 w-4" /> Add FAQ
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search question or answer…" />
        <Select value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </Toolbar>

      {forbidden ? (
        <Alert tone="warning">You do not have permission to view FAQs.</Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getRowKey={(f) => f._id}
            loading={loading}
            error={error}
            emptyTitle="No FAQs found"
            emptyDescription="Add a FAQ to get started."
          />
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      <FaqViewModal faq={view} onClose={() => setView(null)} />
      {form && (
        <FaqFormModal
          mode={form.mode}
          faq={form.faq}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); reload(); }}
        />
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={toDelete ? 'Delete FAQ' : ''}
        size="sm"
        footer={
          <ConfirmFooter
            onCancel={() => setToDelete(null)}
            onConfirm={confirmDelete}
            confirmLabel="Delete FAQ"
            confirmVariant="danger"
            loading={delBusy}
          />
        }
      >
        <div className="space-y-3">
          {delError && <Alert tone="error">{delError}</Alert>}
          <p className="text-sm text-slate-600">This permanently deletes the FAQ. This action is audited.</p>
        </div>
      </Modal>
    </div>
  );
}
function FaqViewModal({ faq, onClose }: { faq: Faq | null; onClose: () => void }) {
  if (!faq) return null;
  return (
    <Modal open onClose={onClose} title={faq.question} description="FAQ details" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={faq.isActive ? 'ACTIVE' : 'INACTIVE'} />
          <span className="text-xs text-slate-500">Order {faq.order} · Created {formatDate(faq.createdAt)}</span>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Answer</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{faq.answer}</p>
        </div>
      </div>
    </Modal>
  );
}
function FaqFormModal({ mode, faq, onClose, onSaved }: {
  mode: 'create' | 'edit';
  faq?: Faq;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FaqForm>(() =>
    faq
      ? { question: faq.question, answer: faq.answer, order: String(faq.order), isActive: faq.isActive }
      : EMPTY_FORM,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FaqForm>(key: K, value: FaqForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const questionValid = form.question.trim().length >= 1;
  const answerValid = form.answer.trim().length >= 1;
  const orderValid =
    form.order.trim() === '' || (Number.isInteger(Number(form.order)) && Number(form.order) >= 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        order: form.order.trim() ? Number(form.order) : 0,
        isActive: form.isActive,
      };
      if (mode === 'create') {
        await api.post('/admin/faqs', body);
      } else if (faq) {
        await api.patch(`/admin/faqs/${faq._id}`, body);
      }
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError && err.isForbidden
          ? 'You are not permitted to perform this action.'
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
      title={mode === 'create' ? 'Add FAQ' : 'Edit FAQ'}
      size="md"
      footer={
        <ConfirmFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmLabel={mode === 'create' ? 'Create FAQ' : 'Save changes'}
          loading={busy}
          disabled={!questionValid || !answerValid || !orderValid}
        />
      }
    >
      <div className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Question" required>
          <Input value={form.question} onChange={(e) => set('question', e.target.value)} placeholder="e.g. How do I book an appointment?" />
        </Field>
        <Field label="Answer" required>
          <Textarea rows={6} value={form.answer} onChange={(e) => set('answer', e.target.value)} placeholder="Answer shown to users…" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Order" hint="Lower numbers appear first." error={orderValid ? undefined : 'Enter a whole number ≥ 0'}>
            <Input type="number" min={0} value={form.order} onChange={(e) => set('order', e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={form.isActive ? 'true' : 'false'} onChange={(e) => set('isActive', e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}






