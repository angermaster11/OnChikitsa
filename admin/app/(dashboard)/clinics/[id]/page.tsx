'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Clinic } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/Badge';
import { Alert, PageLoader } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { Modal, ConfirmFooter } from '@/components/Modal';
import { Field as FormField, Input } from '@/components/Input';
import { formatDate, formatDateTime, orDash } from '@/lib/format';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </Card>
  );
}

function BackHeader({ title = 'Clinic' }: { title?: string }) {
  return (
    <PageHeader
      title={title}
      actions={
        <Link href="/clinics">
          <Button variant="secondary" size="sm">Back to clinics</Button>
        </Link>
      }
    />
  );
}

const yesNo = (v?: boolean) => (v === undefined ? '—' : v ? 'Yes' : 'No');

export default function ClinicDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { hasPermission } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [editCommission, setEditCommission] = useState(false);
  const [editValidity, setEditValidity] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setClinic(await api.get<Clinic>(`/admin/clinics/${id}`));
    } catch (err) {
      if (err instanceof ApiError && err.isForbidden) setForbidden(true);
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader label="Loading clinic…" />;
  if (forbidden) {
    return (
      <div className="space-y-5">
        <BackHeader />
        <Alert tone="warning">You do not have permission to view this clinic.</Alert>
      </div>
    );
  }
  if (error || !clinic) {
    return (
      <div className="space-y-5">
        <BackHeader />
        <Alert tone="error">{error ?? 'Clinic not found.'}</Alert>
      </div>
    );
  }

  const addr = clinic.address;
  const loc = clinic.location;
  const sc = clinic.slotConfiguration;
  const specialties = clinic.specialties ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={clinic.name}
        description={`Clinic account · registered ${formatDate(clinic.createdAt)}`}
        actions={
          <Link href="/clinics">
            <Button variant="secondary" size="sm">Back to clinics</Button>
          </Link>
        }
      />

      {clinic.banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clinic.banner} alt="" className="h-40 w-full rounded-xl object-cover ring-1 ring-slate-200" />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Overview">
          <Field label="Status"><StatusBadge status={clinic.status} /></Field>
          <Field label="Doctors">{orDash(clinic.doctorsCount)}</Field>
          <Field label="Years in service">{clinic.yearsOld != null ? `${clinic.yearsOld} yr` : '—'}</Field>
          <Field label="Clinic ID"><span className="font-mono text-xs break-all">{clinic._id}</span></Field>
        </SectionCard>

        <SectionCard title="Contact">
          <Field label="Primary phone"><span className="tabular-nums">{clinic.phone1}</span></Field>
          <Field label="Secondary phone"><span className="tabular-nums">{orDash(clinic.phone2)}</span></Field>
          <Field label="Email">{orDash(clinic.email)}</Field>
        </SectionCard>
        <SectionCard title="Address">
          {addr && (addr.line || addr.city || addr.state || addr.pincode || addr.formatted) ? (
            <>
              <Field label="Line">{orDash(addr.line)}</Field>
              <Field label="City">{orDash(addr.city)}</Field>
              <Field label="State">{orDash(addr.state)}</Field>
              <Field label="Pincode">{orDash(addr.pincode)}</Field>
              {addr.formatted && <Field label="Formatted">{addr.formatted}</Field>}
            </>
          ) : (
            <p className="text-sm text-slate-500">No address on file.</p>
          )}
        </SectionCard>

        <SectionCard title="Consultation">
          <Field label="Consultation fee">{clinic.consultationFee != null ? `₹${clinic.consultationFee}` : '—'}</Field>
          <Field label="Avg. consultation time">
            {clinic.averageConsultationTime != null ? `${clinic.averageConsultationTime} min` : '—'}
          </Field>
        </SectionCard>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Free re-book window</h2>
            <Button
              size="sm"
              variant="secondary"
              disabled={!hasPermission('CLINIC_UPDATE')}
              onClick={() => setEditValidity(true)}
            >
              Edit validity
            </Button>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Token validity">
              {clinic.tokenValidityDays
                ? `${clinic.tokenValidityDays} day${clinic.tokenValidityDays === 1 ? '' : 's'}`
                : 'Off'}
            </Field>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Within this many days of a paid visit, a patient can re-book this clinic for free using
            their appointment ID. 0 or unset disables free re-booking.
          </p>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Commission &amp; settlement</h2>
            <Button
              size="sm"
              variant="secondary"
              disabled={!hasPermission('CLINIC_UPDATE')}
              onClick={() => setEditCommission(true)}
            >
              Edit commission
            </Button>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Commission">
              {clinic.commissionPercent != null
                ? `${clinic.commissionPercent}% (override)`
                : 'Platform default'}
            </Field>
            <Field label="Settlement">
              <Link href="/wallet" className="text-brand-600 hover:underline">
                View wallet &amp; settle
              </Link>
            </Field>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            The platform collects every payment through Razorpay and settles this clinic&apos;s share
            (consultation fee minus commission) manually from the Wallet.
          </p>
        </Card>

        <SectionCard title="Slot configuration">
          {sc && Object.keys(sc).length > 0 ? (
            <>
              <Field label="Slot duration">{sc.slotDurationMin != null ? `${sc.slotDurationMin} min` : '—'}</Field>
              <Field label="Break between slots">{sc.breakBetweenSlotsMin != null ? `${sc.breakBetweenSlotsMin} min` : '—'}</Field>
              <Field label="Max patients / slot">{orDash(sc.maxPatientsPerSlot)}</Field>
              <Field label="Advance booking">{sc.advanceBookingDays != null ? `${sc.advanceBookingDays} days` : '—'}</Field>
              <Field label="Same-day booking">{yesNo(sc.sameDayBooking)}</Field>
              <Field label="Online bookings">{yesNo(sc.bookingEnabled)}</Field>
            </>
          ) : (
            <p className="text-sm text-slate-500">Not configured — the clinic uses booking defaults.</p>
          )}
        </SectionCard>

        <SectionCard title="Location">
          {loc ? (
            <>
              <Field label="Latitude"><span className="tabular-nums">{loc.lat.toFixed(5)}</span></Field>
              <Field label="Longitude"><span className="tabular-nums">{loc.lng.toFixed(5)}</span></Field>
              <Field label="Accuracy">{loc.accuracy != null ? `±${Math.round(loc.accuracy)} m` : '—'}</Field>
              <Field label="Captured">{formatDateTime(loc.updatedAt)}</Field>
            </>
          ) : (
            <p className="text-sm text-slate-500">No location shared.</p>
          )}
        </SectionCard>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Specialities</h2>
        {specialties.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{s}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No specialities listed.</p>
        )}
      </Card>

      {(clinic.description || clinic.specification) && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">About</h2>
          <div className="space-y-4">
            {clinic.description && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{clinic.description}</p>
              </div>
            )}
            {clinic.specification && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Specification</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{clinic.specification}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <SectionCard title="Activity">
        <Field label="Registered">{formatDateTime(clinic.createdAt)}</Field>
        <Field label="Profile updated">{formatDateTime(clinic.updatedAt)}</Field>
        {clinic.status === 'BANNED' && (
          <>
            <Field label="Banned at">{formatDateTime(clinic.bannedAt)}</Field>
            <Field label="Ban reason">{orDash(clinic.banReason)}</Field>
          </>
        )}
      </SectionCard>

      {editCommission && (
        <CommissionModal
          clinic={clinic}
          onClose={() => setEditCommission(false)}
          onSaved={() => {
            setEditCommission(false);
            void load();
          }}
        />
      )}
      {editValidity && (
        <ValidityModal
          clinic={clinic}
          onClose={() => setEditValidity(false)}
          onSaved={() => {
            setEditValidity(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

/**
 * Per-clinic commission override editor. PATCHes /admin/clinics/:id with the
 * commission percent (or null to fall back to the platform default). Uses the
 * existing CLINIC_UPDATE permission — the backend authorizes the write.
 */
function CommissionModal({
  clinic,
  onClose,
  onSaved,
}: {
  clinic: Clinic;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [useDefault, setUseDefault] = useState(clinic.commissionPercent == null);
  const [value, setValue] = useState(clinic.commissionPercent != null ? String(clinic.commissionPercent) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = Number(value);
  const valid = useDefault || (value.trim() !== '' && Number.isFinite(num) && num >= 0 && num <= 100);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/clinics/${clinic._id}`, { commissionPercent: useDefault ? null : num });
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError && err.isForbidden
          ? 'You are not permitted to update this clinic.'
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
      title="Edit commission"
      description={`Platform's cut of ${clinic.name}'s consultation fee. Applies to future bookings only.`}
      size="sm"
      footer={
        <ConfirmFooter onCancel={onClose} onConfirm={submit} confirmLabel="Save commission" loading={busy} disabled={!valid || busy} />
      }
    >
      <div className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
            checked={useDefault}
            onChange={(e) => setUseDefault(e.target.checked)}
          />
          Use the platform default commission
        </label>
        {!useDefault && (
          <FormField label="Commission (%)" required error={valid ? undefined : 'Enter 0–100'}>
            <Input type="number" min={0} max={100} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
          </FormField>
        )}
      </div>
    </Modal>
  );
}

/**
 * Per-clinic free-rebook window editor. PATCHes /admin/clinics/:id with
 * tokenValidityDays (0 disables it). Uses the CLINIC_UPDATE permission — the
 * backend authorizes the write.
 */
function ValidityModal({
  clinic,
  onClose,
  onSaved,
}: {
  clinic: Clinic;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(clinic.tokenValidityDays != null ? String(clinic.tokenValidityDays) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = Number(value);
  const valid = value.trim() !== '' && Number.isInteger(num) && num >= 0 && num <= 365;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/clinics/${clinic._id}`, { tokenValidityDays: num });
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError && err.isForbidden
          ? 'You are not permitted to update this clinic.'
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
      title="Edit free re-book window"
      description={`How many days ${clinic.name}'s paid-visit token stays valid for a free re-book. 0 disables it.`}
      size="sm"
      footer={
        <ConfirmFooter onCancel={onClose} onConfirm={submit} confirmLabel="Save validity" loading={busy} disabled={!valid || busy} />
      }
    >
      <div className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <FormField label="Token validity (days)" required error={valid ? undefined : 'Enter a whole number 0–365'}>
          <Input type="number" min={0} max={365} step="1" value={value} onChange={(e) => setValue(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}
