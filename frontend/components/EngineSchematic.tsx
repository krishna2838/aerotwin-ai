'use client';
import { useMemo, useState } from 'react';
import clsx from 'clsx';

type Residuals = Record<string, number>;

type Part = {
  id: string;
  label: string;
  sensor: keyof Residuals;
  x: number; y: number; w: number; h: number;
  hint: string;
};

const PARTS: Part[] = [
  { id: 'cyl',  label: 'Cylinder Head',   sensor: 'cht',       x: 90,  y: 60,  w: 160, h: 60,  hint: 'CHT residual' },
  { id: 'exh',  label: 'Exhaust Manifold', sensor: 'egt',      x: 260, y: 70,  w: 180, h: 40,  hint: 'EGT residual' },
  { id: 'oil',  label: 'Oil Circuit',     sensor: 'oil_temp',  x: 90,  y: 145, w: 160, h: 40,  hint: 'Oil temp / press' },
  { id: 'fuel', label: 'Fuel Metering',   sensor: 'fuel_flow', x: 40,  y: 90,  w: 40,  h: 40,  hint: 'Fuel flow residual' },
  { id: 'crk',  label: 'Crankcase',       sensor: 'vibration', x: 130, y: 200, w: 200, h: 45,  hint: 'Vibration RMS' },
];

function colorFor(residual: number, k: string): string {
  const scale: Record<string, number> = { cht: 12, egt: 40, oil_temp: 15, oil_press: 0.8, fuel_flow: 4, vibration: 0.3 };
  const s = scale[k] ?? 1.0;
  const mag = Math.min(1, Math.abs(residual) / s);
  if (mag < 0.33) return '#00e5ff';
  if (mag < 0.66) return '#ffb020';
  return '#ff3b3b';
}

export function EngineSchematic({ residuals, actual }: { residuals: Residuals; actual: Record<string, number> }) {
  const [hover, setHover] = useState<Part | null>(null);
  const parts = useMemo(() => PARTS, []);

  return (
    <div className="panel p-4 scanline">
      <div className="flex items-center justify-between mb-2">
        <div className="mono text-xs tracking-widest text-slate-400">DIGITAL TWIN · ENGINE CUTAWAY</div>
        <div className="mono text-[10px] text-slate-500">Live residual heat map</div>
      </div>
      <svg viewBox="0 0 480 280" className="w-full">
        <defs>
          <linearGradient id="body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1a2233" />
            <stop offset="1" stopColor="#0d1220" />
          </linearGradient>
        </defs>
        {/* Cowling outline */}
        <path d="M20 40 L460 40 L460 260 L20 260 Z" fill="url(#body)" stroke="#243147" strokeWidth="1.5" />
        {/* Propeller shaft */}
        <line x1="0" y1="150" x2="20" y2="150" stroke="#3b4a66" strokeWidth="6" />
        <circle cx="8" cy="150" r="10" fill="#243147" stroke="#3b4a66" />
        {/* Airflow arrows */}
        {[85, 105, 125].map((y) => (
          <path key={y} d={`M25 ${y} l40 0 l-6 -4 M65 ${y} l-6 4`} fill="none" stroke="#00e5ff55" strokeWidth="1.2" />
        ))}
        {/* Turbo */}
        <circle cx="420" cy="220" r="26" fill="#111827" stroke="#3b4a66" />
        <text x="420" y="224" textAnchor="middle" className="mono" fontSize="9" fill="#8899b3">TURBO</text>

        {/* Parts */}
        {parts.map((p) => {
          const r = residuals[p.sensor] ?? 0;
          const c = colorFor(r, p.sensor);
          return (
            <g key={p.id}
               onMouseEnter={() => setHover(p)}
               onMouseLeave={() => setHover(null)}
               style={{ cursor: 'pointer' }}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="6"
                    fill={c + '22'} stroke={c} strokeWidth="1.5"
                    style={{ filter: `drop-shadow(0 0 6px ${c}55)`, transition: 'all 400ms' }} />
              <text x={p.x + 8} y={p.y + 15} className="mono" fontSize="10" fill={c}>
                {p.label}
              </text>
              <text x={p.x + 8} y={p.y + 30} className="mono" fontSize="9" fill="#c9d3e6">
                Δ {(r as number).toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover panel */}
      <div className="mt-3 flex items-center justify-between text-xs mono text-slate-400">
        <div>
          {hover ? (
            <span>
              <span className="text-cyan">{hover.label}</span> · {hover.hint} ·{' '}
              actual <span className="text-slate-200">{(actual[hover.sensor] ?? 0).toString()}</span> ·{' '}
              residual <span style={{ color: colorFor(residuals[hover.sensor] ?? 0, hover.sensor) }}>
                {(residuals[hover.sensor] ?? 0).toFixed(2)}
              </span>
            </span>
          ) : (
            <span>Hover a part to inspect its physics-model residual.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Legend c="#00e5ff" label="Healthy" />
          <Legend c="#ffb020" label="Caution" />
          <Legend c="#ff3b3b" label="Critical" />
        </div>
      </div>
    </div>
  );
}

function Legend({ c, label }: { c: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2.5 h-2.5 rounded" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
      <span>{label}</span>
    </span>
  );
}
