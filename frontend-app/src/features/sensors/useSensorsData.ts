import { useState, useEffect, useRef, useCallback } from 'react';
import {
  API_URL, authHeaders, mapApiSensor, mapApiRule, mapApiFiredAlert, mapApiTelemetryHistory,
  SensorDevice, AlertRule, FiredAlert, TelemetryRecord,
} from './sensorsApi';

export function useSensorsData() {
  const [sensors, setSensors] = useState<SensorDevice[]>([]);
  const [sensorsById, setSensorsById] = useState<Record<number, SensorDevice>>({});
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [firedAlerts, setFiredAlerts] = useState<FiredAlert[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryRecord[]>([]);
  const [toastAlerts, setToastAlerts] = useState<FiredAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);

  const loadSensors = useCallback(async () => {
    const res = await fetch(`${API_URL}/iot/sensors`, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    const byId: Record<number, SensorDevice> = {};
    const mapped = data.map((s: any) => { const m = mapApiSensor(s); byId[s.id] = m; return m; });
    setSensors(mapped);
    setSensorsById(byId);
    return byId;
  }, []);

  const loadRules = useCallback(async (byId: Record<number, SensorDevice>) => {
    const res = await fetch(`${API_URL}/iot/alert-rules`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    setAlertRules(data.map((r: any) => mapApiRule(r, byId)));
  }, []);

  const loadAlerts = useCallback(async (byId: Record<number, SensorDevice>) => {
    const res = await fetch(`${API_URL}/iot/alerts`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    setFiredAlerts(data.map((a: any) => mapApiFiredAlert(a, byId)));
  }, []);

  const loadHistory = useCallback(async (byId: Record<number, SensorDevice>) => {
    try {
      const res = await fetch(`${API_URL}/iot/telemetry/history?limit=1000`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setTelemetryHistory(data.map((t: any) => mapApiTelemetryHistory(t, byId)));
    } catch { /* noop */ }
  }, []);

  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const byId = await loadSensors();
      if (byId) {
        await loadRules(byId);
        await loadAlerts(byId);
        await loadHistory(byId);
      }
    } catch (err) {
      console.error('Error cargando datos de sensores:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadSensors, loadRules, loadAlerts, loadHistory]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // ── WebSocket: telemetría y alertas en tiempo real ─
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const apiOrigin = API_URL.startsWith('http') ? new URL(API_URL) : window.location;
    const wsBase = `${wsProtocol}://${apiOrigin.host}${API_URL.startsWith('http') ? new URL(API_URL).pathname : API_URL}`;
    const ws = new WebSocket(`${wsBase}/iot/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'sensor_update') {
          const updated = mapApiSensor(msg.sensor);
          setSensorsById(prevById => ({ ...prevById, [msg.sensor.id]: updated }));
          setSensors(prev => {
            const exists = prev.some(s => s.id === updated.id);
            return exists ? prev.map(s => s.id === updated.id ? updated : s) : [...prev, updated];
          });
        } else if (msg.event === 'alert_fired') {
          setSensorsById(prevById => {
            const newAlert = mapApiFiredAlert(msg.alert, prevById);
            setFiredAlerts(prev => [newAlert, ...prev].slice(0, 50));
            setToastAlerts(prev => [...prev, newAlert]);
            setTimeout(() => setToastAlerts(prev => prev.filter(t => t.id !== newAlert.id)), 7000);
            return prevById;
          });
        }
      } catch { /* noop */ }
    };

    return () => ws.close();
  }, []);

  const dismissToast = (id: string) => setToastAlerts(prev => prev.filter(t => t.id !== id));

  return {
    sensors, setSensors, sensorsById, setSensorsById,
    alertRules, setAlertRules, firedAlerts, setFiredAlerts,
    telemetryHistory, setTelemetryHistory,
    toastAlerts, dismissToast,
    isLoading, reloadAll,
  };
}
