'use client';
import { useEffect, useState } from 'react';
import { getJSON, Alert } from '@/lib/api';
import { AlertConsole } from '@/components/AlertConsole';

type Filter = 'ALL' | 'INFO' | 'CAUTION' | 'CRITICAL';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    const fetchIt = () => getJSON<{ alerts: Alert[] }>('/alerts?limit=100').then(r => setAlerts(r.alerts)).catch(() => {});
    fetchIt();
    const t = setInterval(fetchIt, 2000);
    return () => clearInterval(t);
  }, []);

  const filtered = filter === 'ALL' ? alerts : alerts.filter((a) => a.severity === filter);

  const counts = {
    INFO: alerts.filter((a) => a.severity === 'INFO').length,
    CAUTION: alerts.filter((a) => a.severity === 'CAUTION').length,
    CRITICAL: alerts.filter((a) => a.severity === 'CRITICAL').length,
  };

  return (
    <div className="space-y-4">
      <div className="panel px-4 py-3 flex items-center gap-3">
        <div className="mono text-[10px] tracking-widest text-slate-400">ALERT HISTORY</div>
        <div className="flex-1" />
        {(['ALL','INFO','CAUTION','CRITICAL'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
                  className={`pill ${filter === f ? 'border-cyan text-cyan bg-cyan-soft' : 'border-ink-600 text-slate-400'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card label="Critical" n={counts.CRITICAL} c="#ff3b3b" />
        <Card label="Caution"  n={counts.CAUTION}  c="#ffb020" />
        <Card label="Info"     n={counts.INFO}     c="#00e5ff" />
      </div>

      <AlertConsole alerts={filtered} />
    </div>
  );
}

function Card({ label, n, c }: { label: string; n: number; c: string }) {
  return (
    <div className="panel p-4" style={{ boxShadow: `0 0 24px ${c}22`, borderColor: c + '55' }}>
      <div className="mono text-[10px] tracking-widest text-slate-400">{label}</div>
      <div className="mono text-3xl font-bold" style={{ color: c }}>{n}</div>
    </div>
  );
}
