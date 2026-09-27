'use client';
import { RUL } from '@/lib/api';

export function RulPanel({ rul }: { rul: RUL | null }) {
  if (!rul) return <div className="panel p-4 mono text-xs text-slate-500">Awaiting RUL…</div>;
  const p50 = rul.p50, p10 = rul.p10, p90 = rul.p90;
  const max = Math.max(140, p90 * 1.1);
  const pct = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="mono text-[10px] tracking-widest text-slate-400">REMAINING USEFUL LIFE</div>
        <div className="mono text-[10px] text-slate-500">cycles</div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="mono text-4xl font-bold text-cyan drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]">
          {p50.toFixed(0)}
        </div>
        <div className="mono text-xs text-slate-400">P50</div>
      </div>
      <div className="mt-3 relative h-3 bg-ink-700 rounded overflow-hidden">
        <div
          className="absolute h-full"
          style={{
            left: `${pct(p10)}%`,
            width: `${pct(p90) - pct(p10)}%`,
            background: 'linear-gradient(90deg, #ff3b3b55, #ffb02055, #00e5ff88)',
          }}
        />
        <div className="absolute h-full w-0.5 bg-cyan" style={{ left: `${pct(p50)}%` }} />
      </div>
      <div className="mt-1 flex justify-between mono text-[10px] text-slate-500">
        <span>P10 {p10.toFixed(0)}</span>
        <span>P50 {p50.toFixed(0)}</span>
        <span>P90 {p90.toFixed(0)}</span>
      </div>
    </div>
  );
}
