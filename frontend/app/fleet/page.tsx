'use client';
import { useEffect, useMemo, useState } from 'react';
import { getJSON } from '@/lib/api';

type Fleet = {
  fleet: {
    id: string; callsign: string; base: string; hours: number;
    health_score: number; band: string; rul_p50: number; mission_ready: boolean;
    last_seen: string;
  }[];
};

type SortKey = 'health' | 'rul' | 'ready';

export default function FleetPage() {
  const [data, setData] = useState<Fleet | null>(null);
  const [sort, setSort] = useState<SortKey>('health');

  useEffect(() => {
    const fetchIt = () => getJSON<Fleet>('/fleet').then(setData).catch(() => {});
    fetchIt();
    const t = setInterval(fetchIt, 4000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    if (!data) return [];
    const rows = [...data.fleet];
    if (sort === 'health') rows.sort((a, b) => a.health_score - b.health_score);
    if (sort === 'rul')    rows.sort((a, b) => a.rul_p50 - b.rul_p50);
    if (sort === 'ready')  rows.sort((a, b) => Number(a.mission_ready) - Number(b.mission_ready));
    return rows;
  }, [data, sort]);

  return (
    <div className="space-y-4">
      <div className="panel px-4 py-3 flex items-center gap-3">
        <div className="mono text-[10px] tracking-widest text-slate-400">FLEET OVERVIEW</div>
        <div className="mono text-xs text-slate-500">8 airframes · auto-refresh 4 s</div>
        <div className="flex-1" />
        <div className="mono text-[10px] text-slate-400">Sort by</div>
        {(['health','rul','ready'] as SortKey[]).map((k) => (
          <button key={k} onClick={() => setSort(k)}
                  className={`pill ${sort === k ? 'border-cyan text-cyan bg-cyan-soft' : 'border-ink-600 text-slate-400'}`}>
            {k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sorted.map((u) => {
          const color = u.band === 'CRITICAL' ? '#ff3b3b' : u.band === 'CAUTION' ? '#ffb020' : '#00e5ff';
          return (
            <div key={u.id} className="panel p-4"
                 style={{ boxShadow: `0 0 24px ${color}22`, borderColor: color + '55' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="mono text-sm font-bold" style={{ color }}>{u.id}</div>
                  <div className="mono text-[10px] text-slate-500">{u.callsign}</div>
                </div>
                <span className="pill" style={{ color, borderColor: color, background: color + '22' }}>
                  {u.band}
                </span>
              </div>
              <div className="mt-2 relative h-2 bg-ink-700 rounded overflow-hidden">
                <div className="absolute inset-y-0 left-0" style={{ width: `${u.health_score}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 mono text-[11px] text-slate-400">
                <div>Health <span className="text-slate-100">{u.health_score.toFixed(0)}</span></div>
                <div>RUL P50 <span className="text-slate-100">{u.rul_p50.toFixed(0)} cyc</span></div>
                <div>Base <span className="text-slate-100">{u.base}</span></div>
                <div>Hrs <span className="text-slate-100">{u.hours}</span></div>
              </div>
              <div className="mt-2 mono text-[10px] flex justify-between">
                <span className="text-slate-500">{u.last_seen}</span>
                <span style={{ color }}>{u.mission_ready ? 'MISSION READY' : 'GROUNDED'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
