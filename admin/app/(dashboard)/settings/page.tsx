'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Alert, PageLoader, Spinner } from '@/components/Feedback';
import { Field, Input, Select } from '@/components/Input';
import { Button } from '@/components/Button';
import { Modal, ConfirmFooter } from '@/components/Modal';
import { formatCurrency, humanize } from '@/lib/format';
import type { GstBase, PricingSettings } from '@/lib/types';

export default function SettingsPage() {
  const { actor, hasPermission } = useAuth();

  if (!actor) return <PageLoader />;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Pricing configuration and your account details." />

      {hasPermission('SETTINGS_VIEW') && <PricingSection canEdit={hasPermission('SETTINGS_UPDATE')} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
          <p className="mt-0.5 text-sm text-slate-500">Read-only. Contact another administrator to change these.</p>
          <dl className="mt-4 space-y-3">
            <Row label="Name" value={actor.name} />
            <Row label="Email" value={actor.email} />
            <div className="grid grid-cols-3 gap-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Role</dt>
              <dd className="col-span-2"><Badge variant="brand">{humanize(actor.role)}</Badge></dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
          <p className="mt-0.5 text-sm text-slate-500">Update the password you use to sign in.</p>
          <Alert tone="info">
            Self-service password changes are not available yet — the backend does not expose an endpoint for this.
            An administrator can reset your password from the Admins page.
          </Alert>
          <form className="mt-4 space-y-3" onSubmit={(e) => e.preventDefault()} aria-disabled>
            <Field label="Current password">
              <Input type="password" disabled placeholder="••••••••" autoComplete="current-password" />
            </Field>
            <Field label="New password">
              <Input type="password" disabled placeholder="••••••••" autoComplete="new-password" />
            </Field>
            {/* TODO: wire up to a self password-change endpoint once the backend exposes one
                (e.g. PATCH /admin/me or /admin/password). Do not invent the endpoint here. */}
            <Button type="submit" disabled>Update password</Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Your permissions</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Effective access granted to your account. The backend enforces these on every request.
        </p>
        {actor.permissions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No permissions assigned.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {actor.permissions.map((p) => (
              <Badge key={p} variant="neutral">{humanize(p)}</Badge>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

const GST_BASE_LABELS: Record<GstBase, string> = {
  PLATFORM_REVENUE: 'Platform revenue (platform fee + commission)',
  PLATFORM_FEE: 'Platform fee only',
};

/**
 * Pricing configuration — the admin-set source of truth for how every booking
 * total is built and split. Read via GET /admin/settings; edited (SETTINGS_UPDATE)
 * via a modal that PATCHes only changed fields. The platform fee is entered in
 * rupees for convenience and converted to integer paise on save.
 */
function PricingSection({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await api.get<PricingSettings>('/admin/settings'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Pricing &amp; distribution</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Platform fee, GST and the default commission applied to every booking. Clinics can have a
            per-clinic commission override on their profile.
          </p>
        </div>
        {settings && canEdit && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit pricing
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
          <Spinner /> Loading pricing…
        </div>
      ) : error ? (
        <Alert tone="error">{error}</Alert>
      ) : settings ? (
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Platform fee" value={formatCurrency(settings.platformFeePaise)} />
          <Metric label="GST rate" value={`${settings.gstRate}%`} />
          <Metric label="Default commission" value={`${settings.defaultCommissionPercent}%`} />
          <Metric label="GST levied on" value={GST_BASE_LABELS[settings.gstBase]} />
        </dl>
      ) : null}

      {editing && settings && (
        <PricingFormModal
          settings={settings}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setSettings(next);
            setEditing(false);
          }}
        />
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

interface PricingForm {
  platformFeeRupees: string;
  gstRate: string;
  defaultCommissionPercent: string;
  gstBase: GstBase;
}

function PricingFormModal({
  settings,
  onClose,
  onSaved,
}: {
  settings: PricingSettings;
  onClose: () => void;
  onSaved: (next: PricingSettings) => void;
}) {
  const [form, setForm] = useState<PricingForm>({
    platformFeeRupees: (settings.platformFeePaise / 100).toString(),
    gstRate: String(settings.gstRate),
    defaultCommissionPercent: String(settings.defaultCommissionPercent),
    gstBase: settings.gstBase,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PricingForm>(key: K, value: PricingForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const feeNum = Number(form.platformFeeRupees);
  const gstNum = Number(form.gstRate);
  const commNum = Number(form.defaultCommissionPercent);
  const feeValid = form.platformFeeRupees.trim() !== '' && Number.isFinite(feeNum) && feeNum >= 0;
  const gstValid = form.gstRate.trim() !== '' && Number.isFinite(gstNum) && gstNum >= 0 && gstNum <= 100;
  const commValid =
    form.defaultCommissionPercent.trim() !== '' && Number.isFinite(commNum) && commNum >= 0 && commNum <= 100;
  const canSubmit = feeValid && gstValid && commValid && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const next = await api.patch<PricingSettings>('/admin/settings', {
        platformFeePaise: Math.round(feeNum * 100),
        gstRate: gstNum,
        defaultCommissionPercent: commNum,
        gstBase: form.gstBase,
      });
      onSaved(next);
    } catch (err) {
      setError(
        err instanceof ApiError && err.isForbidden
          ? 'You are not permitted to update pricing.'
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
      title="Edit pricing"
      description="Applies to every new booking. Existing payments keep their snapshotted breakdown."
      size="md"
      footer={
        <ConfirmFooter onCancel={onClose} onConfirm={submit} confirmLabel="Save pricing" loading={busy} disabled={!canSubmit} />
      }
    >
      <div className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Platform fee (₹)" required hint="Flat charge added to every booking." error={feeValid ? undefined : 'Enter an amount ≥ 0'}>
            <Input type="number" min={0} step="0.01" value={form.platformFeeRupees} onChange={(e) => set('platformFeeRupees', e.target.value)} />
          </Field>
          <Field label="GST rate (%)" required error={gstValid ? undefined : 'Enter 0–100'}>
            <Input type="number" min={0} max={100} step="0.01" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
          </Field>
          <Field label="Default commission (%)" required hint="Platform's cut of the consultation fee." error={commValid ? undefined : 'Enter 0–100'}>
            <Input type="number" min={0} max={100} step="0.01" value={form.defaultCommissionPercent} onChange={(e) => set('defaultCommissionPercent', e.target.value)} />
          </Field>
          <Field label="GST levied on">
            <Select value={form.gstBase} onChange={(e) => set('gstBase', e.target.value as GstBase)}>
              <option value="PLATFORM_REVENUE">{GST_BASE_LABELS.PLATFORM_REVENUE}</option>
              <option value="PLATFORM_FEE">{GST_BASE_LABELS.PLATFORM_FEE}</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
