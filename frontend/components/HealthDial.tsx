'use client';
type Props = { score: number; band: string };

export function HealthDial({ score, band }: Props) {
  const s = Math.max(0, Math.min(100, score));
  const color = band === 'CRITICAL' ? '#ff3b3b' : band === 'CAUTION' ? '#ffb020' : '#00e5ff';
  const angle = -120 + (s / 100) * 240;

  const arc = (a1: number, a2: number, r: number) => {
    const cx = 100, cy = 100;
    const rad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(a1 - 90));
    const y1 = cy + r * Math.sin(rad(a1 - 90));
    const x2 = cx + r * Math.cos(rad(a2 - 90));
    const y2 = cy + r * Math.sin(rad(a2 - 90));
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`;
  };

  return (
    <div className="panel p-4 flex flex-col items-center scanline" style={{ boxShadow: `0 0 32px ${color}55` }}>
      <div className="mono text-[10px] tracking-widest text-slate-400 mb-1">HEALTH INDEX</div>
      <svg viewBox="0 0 200 160" className="w-full">
        {/* Bands */}
        <path d={arc(-120, -24, 80)} fill="none" stroke="#ff3b3b55" strokeWidth="12" strokeLinecap="butt" />
        <path d={arc(-24, 48, 80)} fill="none" stroke="#ffb02055" strokeWidth="12" strokeLinecap="butt" />
        <path d={arc(48, 120, 80)} fill="none" stroke="#00e5ff55" strokeWidth="12" strokeLinecap="butt" />
        {/* Inner track */}
        <path d={arc(-120, 120, 62)} fill="none" stroke="#243147" strokeWidth="10" strokeLinecap="round" />
        <path
          d={arc(-120, angle, 62)}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'all 400ms' }}
        />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: 'transform 400ms' }}>
          <line x1="100" y1="100" x2="100" y2="42" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="6" fill={color} />
        </g>
      </svg>
      <div className="-mt-4 flex flex-col items-center">
        <div className="mono text-5xl font-bold" style={{ color }}>{s.toFixed(0)}</div>
        <div className="mono text-xs tracking-widest mt-1" style={{ color }}>{band}</div>
      </div>
    </div>
  );
}
