'use client';

import { useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePaginatedList, useDebouncedValue } from '@/lib/useList';
import type { StaffAdmin, StaffRole, AdminStatus, Permission } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Toolbar, SearchInput } from '@/components/Toolbar';
import { Select, Input, Field } from '@/components/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge, Badge } from '@/components/Badge';
import { Alert } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal, ConfirmFooter } from '@/components/Modal';
import { PlusIcon } from '@/components/Icons';
import { formatDate, formatDateTime, humanize } from '@/lib/format';

const LIMIT = 20;
// SUPER_ADMIN can never be created or assigned through the API — only ADMIN/SUPPORT.
const MANAGEABLE_ROLES: StaffRole[] = ['ADMIN', 'SUPPORT'];

const PERMISSION_GROUPS: Array<{ label: string; perms: Permission[] }> = [
  { label: 'Users', perms: ['USER_VIEW', 'USER_UPDATE', 'USER_BAN', 'USER_UNBAN', 'USER_DELETE'] },
  { label: 'Clinics', perms: ['CLINIC_VIEW', 'CLINIC_UPDATE', 'CLINIC_BAN', 'CLINIC_UNBAN', 'CLINIC_DELETE'] },
  { label: 'Doctors', perms: ['DOCTOR_VIEW', 'DOCTOR_CREATE', 'DOCTOR_UPDATE', 'DOCTOR_DELETE'] },
  { label: 'Admins', perms: ['ADMIN_VIEW', 'ADMIN_CREATE', 'ADMIN_UPDATE', 'ADMIN_DISABLE'] },
  { label: 'Support', perms: ['SUPPORT_VIEW', 'SUPPORT_CREATE', 'SUPPORT_UPDATE', 'SUPPORT_DISABLE'] },
  { label: 'Platform', perms: ['AUDIT_LOG_VIEW', 'DASHBOARD_VIEW'] },
];

function passwordIssue(pw: string): string | null {
  if (pw.length < 8) return 'At least 8 characters';
  if (!/[a-z]/.test(pw)) return 'Include a lowercase letter';
  if (!/[A-Z]/.test(pw)) return 'Include an uppercase letter';
  if (!/[0-9]/.test(pw)) return 'Include a digit';
  return null;
}
export default function AdminsPage() {
  const { actor, hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { items, pagination, loading, error, forbidden, reload } = usePaginatedList<StaffAdmin>('/admin/admins', {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    role: role || undefined,
    status: status || undefined,
  });

  const [form, setForm] = useState<{ mode: 'create' | 'edit'; admin?: StaffAdmin } | null>(null);
  const [toDisable, setToDisable] = useState<StaffAdmin | null>(null);
  const [disBusy, setDisBusy] = useState(false);
  const [disError, setDisError] = useState<string | null>(null);

  const canCreate = hasPermission('ADMIN_CREATE') || hasPermission('SUPPORT_CREATE');

  async function confirmDisable() {
    if (!toDisable) return;
    setDisBusy(true);
    setDisError(null);
    try {
      await api.post(`/admin/admins/${toDisable.id}/disable`);
      setToDisable(null);
      reload();
    } catch (err) {
      setDisError(
        err instanceof ApiError && err.isForbidden
          ? 'You are not permitted to perform this action.'
          : errorMessage(err),
      );
    } finally {
      setDisBusy(false);
    }
  }

  const columns: Column<StaffAdmin>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (a) => (
        <div>
          <p className="font-medium text-slate-900">
            {a.name}
            {a.id === actor?.id && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
          </p>
          <p className="text-xs text-slate-500">{a.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (a) => <Badge variant={a.role === 'SUPER_ADMIN' ? 'brand' : 'neutral'}>{humanize(a.role)}</Badge> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'lastLogin', header: 'Last login', render: (a) => formatDateTime(a.lastLoginAt) },
    { key: 'created', header: 'Created', render: (a) => formatDate(a.createdAt) },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (a) => {
        // SUPER_ADMIN records are protected server-side and cannot be managed here.
        if (a.role === 'SUPER_ADMIN') return <span className="text-xs text-slate-400">Protected</span>;
        return (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="secondary" disabled={!hasPermission('ADMIN_UPDATE')} onClick={() => setForm({ mode: 'edit', admin: a })}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              disabled={!hasPermission('ADMIN_DISABLE') || a.status === 'DISABLED' || a.id === actor?.id}
              onClick={() => setToDisable(a)}
            >
              Disable
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admins"
        description="Staff accounts and their access."
        actions={
          <Button disabled={!canCreate} onClick={() => setForm({ mode: 'create' })}>
            <PlusIcon className="h-4 w-4" /> Add staff
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name or email" />
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="sm:w-44" aria-label="Filter by role">
          <option value="">All roles</option>
          <option value="SUPER_ADMIN">Super admin</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPPORT">Support</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </Select>
      </Toolbar>

      {forbidden ? (
        <Alert tone="warning">You do not have permission to view staff accounts.</Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getRowKey={(a) => a.id}
            loading={loading}
            error={error}
            emptyTitle="No staff found"
            emptyDescription="Try adjusting your search or filters."
          />
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      {form && (
        <AdminFormModal
          mode={form.mode}
          admin={form.admin}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); reload(); }}
        />
      )}

      <Modal
        open={!!toDisable}
        onClose={() => setToDisable(null)}
        title={toDisable ? `Disable ${toDisable.name}` : ''}
        size="sm"
        footer={
          <ConfirmFooter
            onCancel={() => setToDisable(null)}
            onConfirm={confirmDisable}
            confirmLabel="Disable account"
            confirmVariant="danger"
            loading={disBusy}
          />
        }
      >
        <div className="space-y-3">
          {disError && <Alert tone="error">{disError}</Alert>}
          <p className="text-sm text-slate-600">
            This disables the account and revokes its active sessions. You can re-enable it later by editing the account.
          </p>
        </div>
      </Modal>
    </div>
  );
}
function AdminFormModal({
  mode,
  admin,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  admin?: StaffAdmin;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(admin?.name ?? '');
  const [email, setEmail] = useState(admin?.email ?? '');
  const [phone, setPhone] = useState(admin?.phone ?? '');
  const [role, setRole] = useState<StaffRole>(
    admin && MANAGEABLE_ROLES.includes(admin.role) ? admin.role : 'SUPPORT',
  );
  const [statusVal, setStatusVal] = useState<AdminStatus>(admin?.status ?? 'ACTIVE');
  const [password, setPassword] = useState('');
  const [perms, setPerms] = useState<Permission[]>(admin?.permissions ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePerm(p: Permission) {
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  const emailValid = mode === 'edit' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const pwIssue = mode === 'create' ? passwordIssue(password) : password ? passwordIssue(password) : null;
  const canSubmit = name.trim().length >= 1 && emailValid && !pwIssue && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') {
        await api.post('/admin/admins', {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          role,
          password,
          permissions: perms.length ? perms : undefined,
        });
      } else if (admin) {
        const body: Record<string, unknown> = {
          name: name.trim(),
          phone: phone.trim() || undefined,
          role,
          status: statusVal,
          permissions: perms,
        };
        if (password) body.password = password;
        await api.patch(`/admin/admins/${admin.id}`, body);
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
      title={mode === 'create' ? 'Add staff account' : `Edit ${admin?.name ?? 'staff'}`}
      size="lg"
      footer={
        <ConfirmFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmLabel={mode === 'create' ? 'Create account' : 'Save changes'}
          loading={busy}
          disabled={!canSubmit}
        />
      }
    >
      <div className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Email" required={mode === 'create'}>
            <Input type="email" value={email} disabled={mode === 'edit'} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Role" required>
            <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
              {MANAGEABLE_ROLES.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
            </Select>
          </Field>
          {mode === 'edit' && (
            <Field label="Status">
              <Select value={statusVal} onChange={(e) => setStatusVal(e.target.value as AdminStatus)}>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </Select>
            </Field>
          )}
          <Field
            label={mode === 'create' ? 'Password' : 'Reset password'}
            required={mode === 'create'}
            hint={mode === 'edit' ? 'Leave blank to keep the current password.' : 'Min 8 chars with upper, lower and a digit.'}
            error={pwIssue ?? undefined}
          >
            <Input type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>

        <Field label="Permissions" hint="Grant the specific actions this account may perform.">
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {group.perms.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
                        checked={perms.includes(p)}
                        onChange={() => togglePerm(p)}
                      />
                      {humanize(p)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}


