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
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
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

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundMessage, setFundMessage] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [funding, setFunding] = useState(false);

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

  useEffect(() => {
    if (fundAmount) {
      setFundMessage(`Your wallet has been credited with ₹${fundAmount}. Use it on your next booking!`);
    } else {
      setFundMessage('');
    }
  }, [fundAmount]);

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) return;
    setFunding(true);
    try {
      await api.post(`/admin/users/${id}/wallet/fund`, {
        amountPaise: Math.round(amt * 100),
        message: sendNotification ? fundMessage : undefined,
      });
      setWalletModalOpen(false);
      setFundAmount('');
      void load();
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setFunding(false);
    }
  };

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

        <SectionCard title="Wallet">
          <Field label="Balance">
            ₹{((user.walletBalancePaise || 0) / 100).toFixed(2)}
          </Field>
          <div className="mt-4">
            <Button size="sm" onClick={() => setWalletModalOpen(true)}>Fund Wallet</Button>
          </div>
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

      <Modal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} title="Fund Wallet">
        <form onSubmit={handleFundWallet} className="space-y-4">
          <Field label="Amount (₹)">
            <Input
              type="number"
              min="1"
              step="1"
              required
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Message</label>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              value={fundMessage}
              onChange={(e) => setFundMessage(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendNotification"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
            />
            <label htmlFor="sendNotification" className="text-sm text-slate-700">Send notification to user</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setWalletModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit" loading={funding}>Fund Wallet</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
