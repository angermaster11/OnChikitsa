'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { humanize } from '@/lib/format';
import { Button } from './Button';
import { LogoutIcon, MenuIcon } from './Icons';
import { NAV_ITEMS } from './Sidebar';

function currentTitle(pathname: string): string {
  const match = NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return match?.label ?? 'Admin';
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { actor, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label="Open navigation"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-900">{currentTitle(pathname)}</h1>
      </div>

      <div className="flex items-center gap-3">
        {actor && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initials(actor.name)}
            </div>
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-slate-900">{actor.name}</p>
              <p className="text-xs text-slate-500">{humanize(actor.role)}</p>
            </div>
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={() => void logout()}>
          <LogoutIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
