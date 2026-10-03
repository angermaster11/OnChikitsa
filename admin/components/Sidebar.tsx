'use client';

import type { ComponentType, SVGProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AdminsIcon,
  AuditIcon,
  ClinicIcon,
  DashboardIcon,
  DoctorIcon,
  FaqIcon,
  PaymentsIcon,
  WalletIcon,
  SettingsIcon,
  SupportIcon,
  UsersIcon,
} from './Icons';

export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/users', label: 'Users', Icon: UsersIcon },
  { href: '/clinics', label: 'Clinics', Icon: ClinicIcon },
  { href: '/doctors', label: 'Doctors', Icon: DoctorIcon },
  { href: '/admins', label: 'Admins', Icon: AdminsIcon },
  { href: '/support', label: 'Support', Icon: SupportIcon },
  { href: '/clinic-support', label: 'Clinic Support', Icon: SupportIcon },
  { href: '/faqs', label: 'FAQs', Icon: FaqIcon },
  { href: '/transactions', label: 'Transactions', Icon: PaymentsIcon },
  { href: '/wallet', label: 'Wallet', Icon: WalletIcon },
  { href: '/notifications', label: 'Notifications', Icon: AuditIcon },
  { href: '/audit-logs', label: 'Audit Logs', Icon: AuditIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
  { href: '/legal', label: 'Legal Policies', Icon: AuditIcon },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            O
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">OnChikitsa</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Admin</p>
          </div>
        </div>

        <nav className="scroll-slim flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-brand-600' : 'text-slate-400'}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <p className="text-[11px] text-slate-400">OnChikitsa Admin Console</p>
        </div>
      </aside>
    </>
  );
}
