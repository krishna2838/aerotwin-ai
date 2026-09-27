'use client';
import { Alert } from '@/lib/api';
import clsx from 'clsx';
import { useState } from 'react';

const COLORS: Record<string, string> = {
  INFO: '#00e5ff',
  CAUTION: '#ffb020',
  CRITICAL: '#ff3b3b',
};

export function AlertConsole({ alerts, compact = false }: { alerts: Alert[]; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);

  if (!alerts || alerts.length === 0) {
    return (
      <div className="panel p-4">
        <div className="mono text-[10px] tracking-widest text-slate-400 mb-2">ALERT CONSOLE</div>
        <div className="text-sm text-slate-500 mono">◇ All systems nominal.</div>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="mono text-[10px] tracking-widest text-slate-400">ALERT CONSOLE</div>
        <div className="mono text-[10px] text-slate-500">{alerts.length} entries</div>
      </div>
      <div className={clsx('space-y-2 overflow-auto pr-1', compact ? 'max-h-[240px]' : 'max-h-[500px]')}>
        {alerts.map((a) => {
          const c = COLORS[a.severity] ?? '#00e5ff';
          const opened = open === a.id;
          const topContrib = Object.entries(a.contributions || {})
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 4);
          return (
            <button
              key={a.id}
              onClick={() => setOpen(opened ? null : a.id)}
              className="w-full text-left rounded-md border p-2.5 transition hover:bg-ink-700/40"
              style={{ borderColor: c + '55' }}
            >
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: c + '22', color: c, border: `1px solid ${c}66` }}>
                  {a.severity}
                </span>
                <span className="mono text-[10px] text-slate-500">{a.id} · {a.ts.slice(11, 19)}</span>
              </div>
              <div className="mt-1 text-sm text-slate-100">{a.title}</div>
              <div className="mt-0.5 text-xs text-slate-400">{a.detail}</div>
              {opened && (
                <div className="mt-2 border-t border-ink-700 pt-2">
                  <div className="mono text-[10px] text-slate-500 mb-1">TOP CONTRIBUTING SENSORS</div>
                  {topContrib.map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <div className="mono text-[10px] text-slate-400 w-12">{k}</div>
                      <div className="flex-1 h-1.5 bg-ink-700 rounded overflow-hidden">
                        <div
                          className="h-full"
                          style={{ width: `${Math.min(100, (v as number) * 100)}%`, background: c }}
                        />
                      </div>
                      <div className="mono text-[10px] text-slate-300 w-10 text-right">
                        {((v as number) * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
