'use client';
import { useEffect, useState } from 'react';
import { useLive } from '@/lib/useLive';
import { postJSON, getJSON } from '@/lib/api';
import { Gauge } from '@/components/Gauge';
import { HealthDial } from '@/components/HealthDial';
import { EngineSchematic } from '@/components/EngineSchematic';
import { MissionCard, MissionResult } from '@/components/MissionCard';
import { AlertConsole } from '@/components/AlertConsole';
import { SensorChart } from '@/components/SensorChart';
import { RulPanel } from '@/components/RulPanel';
import clsx from 'clsx';

const FLEET_IDS = ['UAV-01','UAV-02','UAV-03','UAV-04','UAV-05','UAV-06','UAV-07','UAV-08'];

export default function Dashboard() {
  const { packet, history, connected } = useLive();
  const [uav, setUav] = useState('UAV-01');
  const [mission, setMission] = useState<MissionResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Auto-refresh mission verdict whenever packet advances a lot.
    if (!packet) return;
    const t = setTimeout(async () => {
      try {
        const r = await postJSON<MissionResult>('/mission/assess', {
          duration_cycles: 50, criticality: 'medium', altitude_ft: 18000,
        });
        setMission(r);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [packet?.cycle]);

  const runFastForward = async () => {
    setBusy(true);
    try { await postJSON('/mission/fastforward', { cycles: 100 }); }
    finally { setTimeout(() => setBusy(false), 500); }
  };

  const band = packet?.health?.band ?? 'HEALTHY';
  const pillColor = band === 'CRITICAL' ? 'text-crit border-crit/60 bg-crit/10'
                  : band === 'CAUTION' ? 'text-amber border-amber/60 bg-amber/10'
                  : 'text-cyan border-cyan/60 bg-cyan/10';

  const s = packet?.sensors ?? { rpm: 0, cht: 0, egt: 0, oil_temp: 0, oil_press: 0, fuel_flow: 0, vibration: 0 };
  const res = packet?.twin?.residuals ?? {};
  const alerts = packet?.alerts ?? [];

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="panel px-4 py-3 flex flex-wrap items-center gap-3">
        <label className="mono text-[10px] tracking-widest text-slate-400">UAV</label>
        <select value={uav} onChange={(e) => setUav(e.target.value)}
                className="bg-ink-900 border border-ink-600 rounded-md px-2 py-1 mono text-sm">
          {FLEET_IDS.map((id) => <option key={id}>{id}</option>)}
        </select>
        <div className="mono text-xs text-slate-400">
          MISSION <span className="text-slate-200">SURV-OPS-{new Date().toISOString().slice(0,10)}</span>
        </div>
        <div className="flex-1" />
        <div className={clsx('pill', pillColor)}>
          {band}
        </div>
        <div className="mono text-[10px] text-slate-500">
          {connected ? <span className="text-cyan">◉ LIVE</span> : <span className="text-amber">◌ RECONNECTING…</span>}
          {packet && <> · cycle {packet.cycle}/{packet.life_length} · unit {packet.unit_id}</>}
        </div>
        <button
          onClick={runFastForward}
          disabled={busy}
          className="pill border-cyan/60 text-cyan hover:bg-cyan/20 disabled:opacity-50"
        >
          ▶▶  Fast-forward 100 cycles
        </button>
      </div>

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT — gauges */}
        <div className="lg:col-span-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Gauge label="RPM"       value={s.rpm}       unit="rpm"  min={1000} max={6000} warn={5700} crit={5900}/>
            <Gauge label="CHT"       value={s.cht}       unit="°C"   min={40}   max={160}  warn={125}  crit={140}/>
            <Gauge label="EGT"       value={s.egt}       unit="°C"   min={200}  max={950}  warn={830}  crit={900}/>
            <Gauge label="Oil Temp"  value={s.oil_temp}  unit="°C"   min={30}   max={150}  warn={120}  crit={135}/>
            <Gauge label="Oil Press" value={s.oil_press} unit="bar"  min={0.5}  max={6.5}  warn={2.0}  crit={1.5} reverse/>
            <Gauge label="Fuel Flow" value={s.fuel_flow} unit="L/h"  min={5}    max={40}   warn={32}   crit={36}/>
            <Gauge label="Vibration" value={s.vibration} unit="g"    min={0}    max={3}    warn={1.2}  crit={1.8}/>
            <div className="panel p-3">
              <div className="mono text-[10px] tracking-widest text-slate-400 mb-1">RESIDUAL L2</div>
              <div className="mono text-2xl font-bold text-cyan">
                {(packet?.residual_magnitude ?? 0).toFixed(2)}
              </div>
              <div className="mono text-[10px] text-slate-500 mt-2">
                Anomaly score{' '}
                <span className="text-slate-200">{((packet?.anomaly?.score ?? 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="mono text-[10px] text-slate-500">
                Fault{' '}
                <span className="text-slate-200">{packet?.fault?.label ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER — twin + health + rul */}
        <div className="lg:col-span-5 space-y-3">
          <EngineSchematic residuals={res as any} actual={s as any} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HealthDial score={packet?.health?.score ?? 100} band={band} />
            <RulPanel rul={packet?.rul ?? null} />
          </div>
        </div>

        {/* RIGHT — mission + alerts */}
        <div className="lg:col-span-3 space-y-3">
          <MissionCard result={mission} />
          <AlertConsole alerts={alerts} compact />
        </div>
      </div>

      {/* BOTTOM — timeseries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SensorChart history={history} sensorKey="egt"       label="EGT · actual vs expected"      color="#ffb020" />
        <SensorChart history={history} sensorKey="cht"       label="CHT · actual vs expected"      color="#00e5ff" />
        <SensorChart history={history} sensorKey="vibration" label="Vibration RMS · actual vs expected" color="#ff3b3b" />
        <SensorChart history={history} sensorKey="rpm"       label="RPM"                             color="#00e5ff" />
        <SensorChart history={history} sensorKey="oil_press" label="Oil Pressure · actual vs expected" color="#00e5ff" />
        <SensorChart history={history} sensorKey="fuel_flow" label="Fuel Flow · actual vs expected"  color="#00e5ff" />
      </div>
    </div>
  );
}
