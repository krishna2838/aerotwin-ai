'use client';
import clsx from 'clsx';

export type MissionResult = {
  verdict: 'GO' | 'CAUTION' | 'INSPECTION';
  reasons: string[];
  safety_reserve_cycles: number;
  inputs?: Record<string, unknown>;
};

const COLORS: Record<string, string> = {
  GO: '#00e5ff',
  CAUTION: '#ffb020',
  INSPECTION: '#ff3b3b',
};
const RINGS: Record<string, string> = {
  GO: 'shadow-glow',
  CAUTION: 'shadow-warn',
  INSPECTION: 'shadow-crit',
};

export function MissionCard({ result }: { result: MissionResult | null }) {
  if (!result) {
    return (
      <div className="panel p-4 min-h-[220px] flex items-center justify-center">
        <div className="mono text-xs text-slate-500">Awaiting mission assessment…</div>
      </div>
    );
  }
  const c = COLORS[result.verdict];
  return (
    <div className={clsx('panel p-4 scanline', RINGS[result.verdict])}>
      <div className="mono text-[10px] tracking-widest text-slate-400 mb-1">MISSION DECISION</div>
      <div className="flex items-baseline gap-3">
        <div className="mono text-5xl font-bold" style={{ color: c }}>{result.verdict}</div>
        <div className="mono text-xs text-slate-400">
          reserve {result.safety_reserve_cycles.toFixed(0)} cyc
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {result.reasons.map((r, i) => (
          <div key={i} className="text-sm text-slate-200 flex gap-2">
            <span className="mono text-xs mt-0.5" style={{ color: c }}>▸</span>
            <span>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
