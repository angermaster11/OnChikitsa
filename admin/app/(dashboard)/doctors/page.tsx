'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePaginatedList, useDebouncedValue } from '@/lib/useList';
import type { Doctor, Clinic, Gender, DoctorStatus } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Toolbar, SearchInput } from '@/components/Toolbar';
import { Select, Input, Field } from '@/components/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/Badge';
import { Alert } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal, ConfirmFooter } from '@/components/Modal';
import { PlusIcon } from '@/components/Icons';
import { formatDate, orDash } from '@/lib/format';

const LIMIT = 20;
const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];

interface DoctorForm {
  clinicId: string;
  name: string;
  qualification: string;
  specialization: string;
  age: string;
  gender: string;
  email: string;
  phone: string;
  status: DoctorStatus;
}

const EMPTY_FORM: DoctorForm = {
  clinicId: '', name: '', qualification: '', specialization: '',
  age: '', gender: '', email: '', phone: '', status: 'ACTIVE',
};

/** Load clinics once for the filter dropdown and clinic-name labels. */
function useClinicOptions() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.getList<Clinic>('/admin/clinics', { query: { limit: 100 } });
        if (!cancelled) setClinics(data);
      } catch {
        /* clinic list is only a convenience for filtering/labels — ignore failures */
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const map = new Map(clinics.map((c) => [c._id, c.name]));
  return { clinics, clinicName: (id: string) => map.get(id) ?? id };
}
export default function DoctorsPage() {
  const { hasPermission } = useAuth();
  const { clinics, clinicName } = useClinicOptions();
  const [search, setSearch] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { items, pagination, loading, error, forbidden, reload } = usePaginatedList<Doctor>('/admin/doctors', {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    clinicId: clinicId || undefined,
    status: status || undefined,
  });

  const [view, setView] = useState<Doctor | null>(null);
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; doctor?: Doctor } | null>(null);
  const [toDelete, setToDelete] = useState<Doctor | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    setDelBusy(true);
    setDelError(null);
    try {
      await api.del(`/admin/doctors/${toDelete._id}`);
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

  const columns: Column<Doctor>[] = [
    {
      key: 'name',
      header: 'Doctor',
      render: (d) => (
        <div>
          <p className="font-medium text-slate-900">{d.name}</p>
          <p className="text-xs text-slate-500">{orDash(d.specialization ?? d.qualification)}</p>
        </div>
      ),
    },
    { key: 'clinic', header: 'Clinic', render: (d) => <span className="text-slate-700">{clinicName(d.clinicId)}</span> },
    { key: 'contact', header: 'Contact', render: (d) => <span className="tabular-nums">{orDash(d.phone ?? d.email)}</span> },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'created', header: 'Created', render: (d) => formatDate(d.createdAt) },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (d) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setView(d)}>View</Button>
          {d.status !== 'DELETED' && (
            <>
              <Button size="sm" variant="secondary" disabled={!hasPermission('DOCTOR_UPDATE')} onClick={() => setForm({ mode: 'edit', doctor: d })}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={!hasPermission('DOCTOR_DELETE')} onClick={() => setToDelete(d)}>
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Doctors"
        description="Practitioners registered under clinics."
        actions={
          <Button disabled={!hasPermission('DOCTOR_CREATE')} onClick={() => setForm({ mode: 'create' })}>
            <PlusIcon className="h-4 w-4" /> Add doctor
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, specialization…" />
        <Select value={clinicId} onChange={(e) => { setClinicId(e.target.value); setPage(1); }} className="sm:w-52" aria-label="Filter by clinic">
          <option value="">All clinics</option>
          {clinics.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DELETED">Deleted</option>
        </Select>
      </Toolbar>

      {forbidden ? (
        <Alert tone="warning">You do not have permission to view doctors.</Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getRowKey={(d) => d._id}
            loading={loading}
            error={error}
            emptyTitle="No doctors found"
            emptyDescription="Try adjusting your search or filters."
          />
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      <DoctorViewModal doctor={view} clinicName={clinicName} onClose={() => setView(null)} />

      {form && (
        <DoctorFormModal
          mode={form.mode}
          doctor={form.doctor}
          clinics={clinics}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); reload(); }}
        />
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={toDelete ? `Delete ${toDelete.name}` : ''}
        size="sm"
        footer={
          <ConfirmFooter
            onCancel={() => setToDelete(null)}
            onConfirm={confirmDelete}
            confirmLabel="Delete doctor"
            confirmVariant="danger"
            loading={delBusy}
          />
        }
      >
        <div className="space-y-3">
          {delError && <Alert tone="error">{delError}</Alert>}
          <p className="text-sm text-slate-600">This soft-deletes the doctor. This action is audited.</p>
        </div>
      </Modal>
    </div>
  );
}
function DoctorViewModal({
  doctor,
  clinicName,
  onClose,
}: {
  doctor: Doctor | null;
  clinicName: (id: string) => string;
  onClose: () => void;
}) {
  if (!doctor) return null;
  const rows: Array<[string, string]> = [
    ['Clinic', clinicName(doctor.clinicId)],
    ['Qualification', orDash(doctor.qualification)],
    ['Specialization', orDash(doctor.specialization)],
    ['Age', orDash(doctor.age)],
    ['Gender', orDash(doctor.gender)],
    ['Email', orDash(doctor.email)],
    ['Phone', orDash(doctor.phone)],
    ['Created', formatDate(doctor.createdAt)],
  ];
  return (
    <Modal open onClose={onClose} title={doctor.name} description="Doctor details" size="md">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</dt>
          <dd className="mt-1"><StatusBadge status={doctor.status} /></dd>
        </div>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

function DoctorFormModal({
  mode,
  doctor,
  clinics,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  doctor?: Doctor;
  clinics: Clinic[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<DoctorForm>(() =>
    doctor
      ? {
          clinicId: doctor.clinicId,
          name: doctor.name,
          qualification: doctor.qualification ?? '',
          specialization: doctor.specialization ?? '',
          age: doctor.age != null ? String(doctor.age) : '',
          gender: doctor.gender ?? '',
          email: doctor.email ?? '',
          phone: doctor.phone ?? '',
          status: doctor.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        }
      : EMPTY_FORM,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof DoctorForm>(key: K, value: DoctorForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const nameValid = form.name.trim().length >= 1;
  const clinicValid = mode === 'edit' || form.clinicId.length > 0;
  const ageValid = form.age.trim() === '' || Number.isFinite(Number(form.age));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const opt = (v: string) => (v.trim() ? v.trim() : undefined);
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        qualification: opt(form.qualification),
        specialization: opt(form.specialization),
        email: opt(form.email),
        phone: opt(form.phone),
        gender: form.gender || undefined,
        age: form.age.trim() ? Number(form.age) : undefined,
      };
      if (mode === 'create') {
        body.clinicId = form.clinicId;
        await api.post('/admin/doctors', body);
      } else if (doctor) {
        body.status = form.status;
        await api.patch(`/admin/doctors/${doctor._id}`, body);
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
      title={mode === 'create' ? 'Add doctor' : `Edit ${doctor?.name ?? 'doctor'}`}
      size="md"
      footer={
        <ConfirmFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmLabel={mode === 'create' ? 'Create doctor' : 'Save changes'}
          loading={busy}
          disabled={!nameValid || !clinicValid || !ageValid}
        />
      }
    >
      <div className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        {mode === 'create' && (
          <Field label="Clinic" required>
            <Select value={form.clinicId} onChange={(e) => set('clinicId', e.target.value)}>
              <option value="">Select a clinic…</option>
              {clinics.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Name" required>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Qualification">
            <Input value={form.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="e.g. MBBS, MD" />
          </Field>
          <Field label="Specialization">
            <Input value={form.specialization} onChange={(e) => set('specialization', e.target.value)} placeholder="e.g. Cardiology" />
          </Field>
          <Field label="Age" error={ageValid ? undefined : 'Enter a valid number'}>
            <Input type="number" min={0} value={form.age} onChange={(e) => set('age', e.target.value)} />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">Unspecified</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
            </Select>
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>
        {mode === 'edit' && (
          <Field label="Status" hint="Use Delete to soft-remove a doctor.">
            <Select value={form.status} onChange={(e) => set('status', e.target.value as DoctorStatus)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}


