import type { ReactNode } from 'react';

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('card p-5', className)}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  icon?: ReactNode;
  accent?: string;
}

/** Compact KPI tile for the dashboard. */
export function StatCard({ label, value, sublabel, icon, accent = 'text-brand-600' }: StatCardProps) {
  return (
    <div className="card flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
      </div>
      {icon && (
        <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50', accent)}>
          {icon}
        </div>
      )}
    </div>
  );
}
