'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { Sidebar } from '@/components/shell/Sidebar';

/**
 * Responsive dashboard shell.
 * - Desktop: persistent 240px sidebar
 * - Mobile/tablet (<md): sidebar collapses into a drawer that opens via a
 *   hamburger in a compact top bar. The drawer auto-closes on route change.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer whenever we navigate.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open on mobile.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <div className="flex min-h-screen surface-primary">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-12 flex items-center justify-between px-3 surface-primary border-b border-t-default">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="h-8 w-8 flex items-center justify-center rounded-md text-t-secondary hover:text-t-primary hover:bg-[var(--bg-tertiary)] transition-base"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>
        <Image
          src="/brand/autodsm-wordmark-light.svg"
          alt="autoDSM"
          width={110}
          height={22}
          className="h-5 w-auto dark:hidden"
        />
        <Image
          src="/brand/autodsm-wordmark-dark.svg"
          alt="autoDSM"
          width={110}
          height={22}
          className="h-5 w-auto hidden dark:block"
        />
        <div className="w-8" />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-[260px] max-w-[80vw] h-full surface-primary border-r border-t-default shadow-lg flex flex-col">
            <div className="flex items-center justify-end h-12 px-2 border-b border-t-default">
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="h-8 w-8 flex items-center justify-center rounded-md text-t-secondary hover:text-t-primary hover:bg-[var(--bg-tertiary)] transition-base"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 pt-12 md:pt-4 px-2 md:pr-4 md:pl-0 pb-2 md:pb-4">
        <div
          className="min-h-[calc(100vh-64px)] md:h-[calc(100vh-32px)] rounded-xl md:rounded-2xl border border-t-default flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
