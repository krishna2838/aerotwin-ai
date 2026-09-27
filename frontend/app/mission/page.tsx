'use client';
import { useEffect, useState } from 'react';
import { postJSON } from '@/lib/api';
import { MissionCard, MissionResult } from '@/components/MissionCard';
import { HealthDial } from '@/components/HealthDial';
import { useLive } from '@/lib/useLive';

export default function MissionPage() {
  const { packet } = useLive();
  const [duration, setDuration] = useState(60);
  const [criticality, setCriticality] = useState<'low'|'medium'|'high'>('high');
  const [altitude, setAltitude] = useState(20000);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await postJSON<MissionResult>('/mission/assess', {
        duration_cycles: duration, criticality, altitude_ft: altitude,
      });
      setResult(r);
    } finally { setBusy(false); }
  };

  useEffect(() => { submit(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { submit(); /* eslint-disable-next-line */ }, [duration, criticality, altitude]);

  return (
    <div className="space-y-4">
      <div className="panel px-4 py-3">
        <div className="mono text-[10px] tracking-widest text-slate-400">MISSION PLANNER</div>
        <div className="text-sm text-slate-300 mt-1">
          Configure the sortie envelope. AEROTWIN-AI re-evaluates the verdict live using the current twin state.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 space-y-3">
          <div className="panel p-4 space-y-4">
            <Slider label="Mission duration" value={duration} min={10} max={200} unit="cycles"
                    onChange={setDuration}/>
            <div>
              <div className="mono text-[10px] tracking-widest text-slate-400 mb-1">CRITICALITY</div>
              <div className="flex gap-2">
                {(['low','medium','high'] as const).map((c) => (
                  <button key={c} onClick={() => setCriticality(c)}
                          className={`pill ${criticality === c ? 'border-cyan text-cyan bg-cyan-soft' : 'border-ink-600 text-slate-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Cruise altitude" value={altitude} min={5000} max={30000} unit="ft" step={500}
                    onChange={setAltitude}/>
            <button onClick={submit} disabled={busy}
                    className="w-full bg-cyan text-black mono font-bold tracking-widest py-2 rounded-md hover:brightness-110 disabled:opacity-50">
              {busy ? 'ASSESSING…' : 'REQUEST VERDICT'}
            </button>
          </div>

          <div className="panel p-3">
            <div className="mono text-[10px] tracking-widest text-slate-400 mb-1">WHAT-IF</div>
            <div className="text-xs text-slate-400 space-y-1.5">
              <div>Try +30 minutes: <button onClick={() => setDuration(duration + 15)} className="underline text-cyan">apply +15 cycles</button></div>
              <div>Push altitude to service ceiling: <button onClick={() => setAltitude(28000)} className="underline text-cyan">28,000 ft</button></div>
              <div>Escalate to HIGH criticality: <button onClick={() => setCriticality('high')} className="underline text-cyan">apply</button></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-3">
          <MissionCard result={result} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HealthDial score={packet?.health?.score ?? 100} band={packet?.health?.band ?? 'HEALTHY'} />
            <div className="panel p-4">
              <div className="mono text-[10px] tracking-widest text-slate-400 mb-2">DECISION TREE</div>
              <ol className="text-xs text-slate-300 space-y-2 mono">
                <li>1. RUL P10 ≥ duration × criticality-margin?</li>
                <li>2. Health index ≥ 70?</li>
                <li>3. Anomaly score ≤ 0.60?</li>
                <li>4. Fault class ≠ IMPENDING_FAILURE?</li>
                <li>5. Altitude within turbo envelope?</li>
              </ol>
              <div className="mt-3 text-[10px] text-slate-500">
                Any failed check → CAUTION (advisory) or INSPECTION (blocking).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, unit, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="mono text-[10px] tracking-widest text-slate-400">{label}</span>
        <span className="mono text-cyan text-sm">{value.toLocaleString()} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={(e) => onChange(parseFloat(e.target.value))}
             className="w-full accent-cyan" />
    </div>
  );
}
