export const API =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000';

export const WS =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) ||
  API.replace(/^http/, 'ws');

export type Sensors = {
  rpm: number; cht: number; egt: number; oil_temp: number;
  oil_press: number; fuel_flow: number; vibration: number;
};

export type TwinState = {
  expected: Record<string, number>;
  actual: Sensors;
  residuals: Record<string, number>;
  ambient_c: number; altitude_ft: number;
};

export type Fault = {
  class_id: number; label: string; confidence: number;
  distribution: Record<string, number>;
};
export type RUL = { p10: number; p50: number; p90: number };
export type Health = { score: number; band: string; components: Record<string, number> };
export type Alert = {
  id: string; ts: string; severity: 'INFO' | 'CAUTION' | 'CRITICAL';
  title: string; detail: string; contributions: Record<string, number>;
};
export type LivePacket = {
  ts: number; unit_id: number; cycle: number; life_length: number;
  sensors: Sensors; twin: TwinState; residual_magnitude: number;
  anomaly: { score: number; contributions: Record<string, number> };
  fault: Fault; rul: RUL; health: Health; alerts: Alert[];
};

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return (await r.json()) as T;
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return (await r.json()) as T;
}
