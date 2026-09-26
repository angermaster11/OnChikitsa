'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { User, PermissionStatus } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { StatusBadge, Badge, type BadgeVariant } from '@/components/Badge';
import { Alert, PageLoader } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { formatDate, formatDateTime, humanize, orDash } from '@/lib/format';

const PERMISSION_VARIANT: Record<PermissionStatus, BadgeVariant> = {
  GRANTED: 'success',
  DENIED: 'danger',
  PROMPT: 'warning',
};

function PermissionBadge({ status }: { status?: PermissionStatus }) {
  const s = status ?? 'PROMPT';
  return <Badge variant={PERMISSION_VARIANT[s]}>{humanize(s)}</Badge>;
}

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

function BackHeader({ title = 'User' }: { title?: string }) {
  return (
    <PageHeader
      title={title}
      actions={
        <Link href="/users">
          <Button variant="secondary" size="sm">Back to users</Button>
        </Link>
      }
    />
  );
}

// PLACEHOLDER_DETAIL_PAGE
export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setUser(await api.get<User>(`/admin/users/${id}`));
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

  if (loading) return <PageLoader label="Loading user…" />;
  if (forbidden) {
    return (
      <div className="space-y-5">
        <BackHeader />
        <Alert tone="warning">You do not have permission to view this user.</Alert>
      </div>
    );
  }
  if (error || !user) {
    return (
      <div className="space-y-5">
        <BackHeader />
        <Alert tone="error">{error ?? 'User not found.'}</Alert>
      </div>
    );
  }

  const loc = user.location;
  return (
    <div className="space-y-5">
      <PageHeader
        title={user.name}
        description={`Patient account · joined ${formatDate(user.createdAt)}`}
        actions={
          <Link href="/users">
            <Button variant="secondary" size="sm">Back to users</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Account">
          <Field label="Status"><StatusBadge status={user.status} /></Field>
          <Field label="Onboarding"><StatusBadge status={user.onboardingStatus ?? 'PENDING'} /></Field>
          <Field label="Authentication">{humanize(user.authProvider ?? 'PHONE')} · Verified</Field>
          <Field label="User ID"><span className="font-mono text-xs break-all">{user._id}</span></Field>
        </SectionCard>

        <SectionCard title="Identity & contact">
          <Field label="Full name">{user.name}</Field>
          <Field label="Phone"><span className="tabular-nums">{user.phone}</span></Field>
          <Field label="Email">{orDash(user.email)}</Field>
          <Field label="Date of birth">{user.dob ? formatDate(user.dob) : '—'}</Field>
          <Field label="Gender">{user.gender ? humanize(user.gender) : '—'}</Field>
          <Field label="Height">{user.height ? `${user.height} cm` : '—'}</Field>
          <Field label="Weight">{user.weight ? `${user.weight} kg` : '—'}</Field>
        </SectionCard>

        <SectionCard title="Permissions">
          <Field label="Notifications"><PermissionBadge status={user.notificationPermission} /></Field>
          <Field label="Location"><PermissionBadge status={user.locationPermission} /></Field>
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

        <SectionCard title="Activity">
          <Field label="Account created">{formatDateTime(user.createdAt)}</Field>
          <Field label="Last login / activity">{formatDateTime(user.lastLoginAt)}</Field>
          <Field label="Profile updated">{formatDateTime(user.updatedAt)}</Field>
          {user.status === 'BANNED' && (
            <>
              <Field label="Banned at">{formatDateTime(user.bannedAt)}</Field>
              <Field label="Ban reason">{orDash(user.banReason)}</Field>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
