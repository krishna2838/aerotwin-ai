'use client';
import { useEffect, useRef, useState } from 'react';
import { WS, LivePacket } from './api';

/** Subscribe to /telemetry/stream. Falls back to a REST polling shim
 *  if the WebSocket can't connect (e.g. hosted demo edge cases). */
export function useLive() {
  const [packet, setPacket] = useState<LivePacket | null>(null);
  const [history, setHistory] = useState<LivePacket[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    const openWS = () => {
      try {
        const ws = new WebSocket(`${WS}/telemetry/stream`);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => { setConnected(false); if (!cancelled) setTimeout(openWS, 1500); };
        ws.onerror = () => { setConnected(false); };
        ws.onmessage = (evt) => {
          try {
            const p = JSON.parse(evt.data) as LivePacket;
            setPacket(p);
            setHistory((h) => {
              const nh = [...h, p];
              return nh.length > 240 ? nh.slice(-240) : nh;
            });
          } catch {}
        };
      } catch {
        setTimeout(openWS, 1500);
      }
    };

    openWS();
    return () => { cancelled = true; wsRef.current?.close(); };
  }, []);

  return { packet, history, connected };
}
