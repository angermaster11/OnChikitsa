'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/Card';
import { Alert, EmptyState, PageLoader } from '@/components/Feedback';
import { StatusBadge } from '@/components/Badge';
import { UsersIcon, ClinicIcon, DoctorIcon } from '@/components/Icons';
import { formatDateTime, humanize } from '@/lib/format';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<DashboardStats>('/admin/dashboard/stats');
        if (!cancelled) setStats(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.isForbidden) setForbidden(true);
        else setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageLoader />;

  if (forbidden) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <Alert tone="warning">You do not have permission to view dashboard statistics.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Platform overview and recent activity." />

      {error && <Alert tone="error">{error}</Alert>}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Users"
              value={stats.users.total.toLocaleString()}
              sublabel={`${stats.users.active.toLocaleString()} active · ${stats.users.banned.toLocaleString()} banned`}
              icon={<UsersIcon className="h-5 w-5" />}
            />
            <StatCard
              label="Clinics"
              value={stats.clinics.total.toLocaleString()}
              sublabel={`${stats.clinics.active.toLocaleString()} active · ${stats.clinics.banned.toLocaleString()} banned`}
              icon={<ClinicIcon className="h-5 w-5" />}
            />
            <StatCard
              label="Doctors"
              value={stats.doctors.total.toLocaleString()}
              sublabel="Active practitioners"
              icon={<DoctorIcon className="h-5 w-5" />}
            />
            <StatCard
              label="New signups"
              value={(stats.newUsers + stats.newClinics).toLocaleString()}
              sublabel={`${stats.newUsers} users · ${stats.newClinics} clinics (7d)`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ActivityCard title="Recent activity" logs={stats.recentAuditLogs} />
            <ActivityCard title="Recent staff activity" logs={stats.recentAdminActivity} />
          </div>
        </>
      )}
    </div>
  );
}

function ActivityCard({ title, logs }: { title: string; logs: DashboardStats['recentAuditLogs'] }) {
  return (
    <div className="card">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {logs.length === 0 ? (
        <EmptyState title="No recent activity" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {logs.map((log) => (
            <li key={log._id} className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-800">{log.description ?? humanize(log.action)}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {log.actorName} · {humanize(log.actorRole)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge status={log.targetType} />
                <span className="whitespace-nowrap text-[11px] text-slate-400">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
