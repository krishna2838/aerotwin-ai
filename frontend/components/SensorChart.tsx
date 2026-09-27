'use client';
import { LivePacket } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

type Props = {
  history: LivePacket[];
  sensorKey: 'rpm' | 'cht' | 'egt' | 'oil_temp' | 'oil_press' | 'fuel_flow' | 'vibration';
  label: string;
  color?: string;
  height?: number;
};

const EXPECTED_KEYS = new Set(['cht', 'egt', 'oil_temp', 'oil_press', 'fuel_flow', 'vibration']);

export function SensorChart({ history, sensorKey, label, color = '#00e5ff', height = 140 }: Props) {
  const data = history.slice(-120).map((p, i) => ({
    i,
    actual: p.sensors[sensorKey],
    expected: EXPECTED_KEYS.has(sensorKey) ? (p.twin?.expected?.[sensorKey] ?? null) : null,
  }));

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="mono text-[10px] tracking-widest text-slate-400">{label}</div>
        <div className="flex items-center gap-3 mono text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} /> actual
          </span>
          {EXPECTED_KEYS.has(sensorKey) && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> expected
            </span>
          )}
        </div>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <XAxis dataKey="i" hide />
            <YAxis
              tick={{ fill: '#8899b3', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              width={40}
              stroke="#243147"
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#0d1220',
                border: '1px solid #243147',
                fontFamily: 'JetBrains Mono',
                fontSize: 11,
              }}
              labelFormatter={() => label}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={color}
              strokeWidth={1.6}
              dot={false}
              isAnimationActive={false}
            />
            {EXPECTED_KEYS.has(sensorKey) && (
              <Line
                type="monotone"
                dataKey="expected"
                stroke="#8899b3"
                strokeDasharray="4 4"
                strokeWidth={1.2}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
