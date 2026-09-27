'use client';
import { useLive } from '@/lib/useLive';
import { EngineSchematic } from '@/components/EngineSchematic';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useMemo, useState } from 'react';

const PARTS = ['cht', 'egt', 'oil_temp', 'oil_press', 'fuel_flow', 'vibration'] as const;

export default function TwinPage() {
  const { packet, history } = useLive();
  const [selected, setSelected] = useState<typeof PARTS[number]>('egt');
  const [scrub, setScrub] = useState(1.0);

  const data = useMemo(() => {
    const start = Math.floor(history.length * (1 - scrub));
    return history.slice(start).map((p, i) => ({
      i,
      actual: p.sensors[selected],
      expected: p.twin?.expected?.[selected],
      residual: (p.sensors[selected] as number) - (p.twin?.expected?.[selected] ?? 0),
    }));
  }, [history, scrub, selected]);

  const s = packet?.sensors ?? { rpm: 0, cht: 0, egt: 0, oil_temp: 0, oil_press: 0, fuel_flow: 0, vibration: 0 };
  const res = packet?.twin?.residuals ?? {};

  return (
    <div className="space-y-4">
      <div className="panel px-4 py-3 flex items-center gap-3">
        <div className="mono text-[10px] tracking-widest text-slate-400">DIGITAL TWIN VIEWER</div>
        <div className="mono text-xs text-slate-500">
          Ambient <span className="text-slate-200">{packet?.twin?.ambient_c ?? 25}°C</span> ·
          Altitude <span className="text-slate-200">{packet?.twin?.altitude_ft?.toLocaleString() ?? '15,000'} ft</span>
        </div>
        <div className="flex-1" />
        <label className="mono text-[10px] text-slate-400">Scrub</label>
        <input type="range" min={0.1} max={1.0} step={0.05} value={scrub}
               onChange={(e) => setScrub(parseFloat(e.target.value))}
               className="w-48 accent-cyan" />
        <span className="mono text-xs text-cyan">{(scrub * 100).toFixed(0)}% window</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <EngineSchematic residuals={res as any} actual={s as any} />
        </div>
        <div className="lg:col-span-5 space-y-3">
          <div className="panel p-4">
            <div className="mono text-[10px] tracking-widest text-slate-400 mb-2">SELECT SENSOR</div>
            <div className="flex flex-wrap gap-2">
              {PARTS.map((k) => (
                <button key={k}
                        onClick={() => setSelected(k)}
                        className={`pill ${selected === k ? 'border-cyan text-cyan bg-cyan-soft' : 'border-ink-600 text-slate-400'}`}>
                  {k}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Stat label="Actual" value={(s as any)[selected]} color="#00e5ff" />
              <Stat label="Expected" value={packet?.twin?.expected?.[selected] ?? 0} color="#8899b3" />
              <Stat label="Residual" value={res[selected] ?? 0} color={Math.abs(res[selected] ?? 0) > 5 ? '#ff3b3b' : '#00e5ff'} />
            </div>
          </div>

          <div className="panel p-3">
            <div className="mono text-[10px] tracking-widest text-slate-400 mb-1">
              PHYSICS vs ACTUAL — {selected.toUpperCase()}
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={data}>
                  <XAxis dataKey="i" hide />
                  <YAxis tick={{ fill: '#8899b3', fontSize: 10 }} width={40} stroke="#243147" />
                  <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #243147', fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                  <Line type="monotone" dataKey="actual" stroke="#00e5ff" dot={false} strokeWidth={1.6} isAnimationActive={false} />
                  <Line type="monotone" dataKey="expected" stroke="#8899b3" strokeDasharray="4 4" dot={false} strokeWidth={1.2} isAnimationActive={false} />
                  <ReferenceLine y={0} stroke="#3b4a66" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel p-3">
            <div className="mono text-[10px] tracking-widest text-slate-400 mb-1">RESIDUAL — {selected.toUpperCase()}</div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer>
                <LineChart data={data}>
                  <XAxis dataKey="i" hide />
                  <YAxis tick={{ fill: '#8899b3', fontSize: 10 }} width={40} stroke="#243147" />
                  <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #243147', fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#3b4a66" />
                  <Line type="monotone" dataKey="residual" stroke="#ffb020" dot={false} strokeWidth={1.4} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="panel p-3 !border-ink-700">
      <div className="mono text-[10px] tracking-widest text-slate-400">{label}</div>
      <div className="mono text-xl font-bold" style={{ color }}>
        {(value as number).toFixed(2)}
      </div>
    </div>
  );
}
