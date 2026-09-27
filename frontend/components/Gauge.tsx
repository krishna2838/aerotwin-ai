'use client';
import clsx from 'clsx';

type Props = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  warn?: number;
  crit?: number;
  reverse?: boolean; // for oil pressure — low is bad
};

export function Gauge({ label, value, unit, min, max, warn, crit, reverse }: Props) {
  const clamped = Math.max(min, Math.min(max, value));
  const pct = (clamped - min) / (max - min);
  const angle = -120 + pct * 240; // -120° to +120°

  let color = '#00e5ff';
  let ring = 'shadow-glow';
  if (crit !== undefined && ((reverse && value <= crit) || (!reverse && value >= crit))) {
    color = '#ff3b3b'; ring = 'shadow-crit';
  } else if (warn !== undefined && ((reverse && value <= warn) || (!reverse && value >= warn))) {
    color = '#ffb020'; ring = 'shadow-warn';
  }

  const arc = (a1: number, a2: number) => {
    const cx = 60, cy = 60, r = 46;
    const rad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(a1 - 90));
    const y1 = cy + r * Math.sin(rad(a1 - 90));
    const x2 = cx + r * Math.cos(rad(a2 - 90));
    const y2 = cy + r * Math.sin(rad(a2 - 90));
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`;
  };

  return (
    <div className={clsx('panel p-3 flex flex-col items-center', ring)}>
      <div className="w-full flex items-center justify-between mb-1">
        <div className="mono text-[10px] tracking-widest text-slate-400">{label}</div>
        <div className="mono text-[10px] text-slate-500">{unit}</div>
      </div>
      <svg viewBox="0 0 120 100" className="w-full">
        <path d={arc(-120, 120)} fill="none" stroke="#243147" strokeWidth="8" strokeLinecap="round" />
        <path
          d={arc(-120, angle)}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'all 300ms' }}
        />
        {/* Ticks */}
        {Array.from({ length: 9 }).map((_, i) => {
          const a = (-120 + i * 30) * Math.PI / 180;
          const x1 = 60 + 52 * Math.cos(a - Math.PI / 2);
          const y1 = 60 + 52 * Math.sin(a - Math.PI / 2);
          const x2 = 60 + 44 * Math.cos(a - Math.PI / 2);
          const y2 = 60 + 44 * Math.sin(a - Math.PI / 2);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b4a66" strokeWidth="1" />;
        })}
        {/* Needle */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '60px 60px', transition: 'transform 300ms' }}>
          <line x1="60" y1="60" x2="60" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="60" r="4" fill={color} />
        </g>
      </svg>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="mono text-2xl font-bold" style={{ color }}>{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
      </div>
      <div className="mono text-[10px] text-slate-500 mt-0.5">
        {min}–{max} {unit}
      </div>
    </div>
  );
}
