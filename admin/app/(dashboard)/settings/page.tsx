'use client';

import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Alert, PageLoader } from '@/components/Feedback';
import { Field, Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { humanize } from '@/lib/format';

export default function SettingsPage() {
  const { actor } = useAuth();

  if (!actor) return <PageLoader />;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Your account details and preferences." />

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
