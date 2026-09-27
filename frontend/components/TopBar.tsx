'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/twin', label: 'Digital Twin' },
  { href: '/mission', label: 'Mission Planner' },
  { href: '/fleet', label: 'Fleet' },
  { href: '/alerts', label: 'Alerts' },
];

export function TopBar() {
  const pathname = usePathname();
  const [light, setLight] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (light) { html.classList.add('light'); html.classList.remove('dark'); }
    else { html.classList.add('dark'); html.classList.remove('light'); }
  }, [light]);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <svg viewBox="0 0 32 32" className="w-7 h-7 text-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">
            <path fill="currentColor" d="M16 2 L28 26 H4 Z M16 8 L23 22 H9 Z" />
          </svg>
          <div className="leading-tight">
            <div className="font-bold tracking-widest text-sm">AEROTWIN-AI</div>
            <div className="text-[10px] text-slate-400 mono">SIH26054 · DRDO</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition',
                pathname === n.href
                  ? 'bg-cyan-soft text-cyan border border-cyan/40'
                  : 'text-slate-300 hover:bg-ink-800 hover:text-cyan'
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="hidden lg:flex items-center gap-2 mono text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan dot-pulse shadow-glow" />
          <span>TELEMETRY 10 Hz</span>
        </div>

        <button
          onClick={() => setLight((v) => !v)}
          className="pill border-ink-600 text-slate-300 hover:text-cyan hover:border-cyan/60"
          title="Toggle theme"
        >
          {light ? '☀ Light' : '☾ Dark'}
        </button>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={clsx(
              'px-3 py-1 text-xs rounded whitespace-nowrap',
              pathname === n.href ? 'bg-cyan-soft text-cyan' : 'text-slate-400'
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
