import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cpu, Activity, Zap, Thermometer, Gauge, AlertTriangle,
  RefreshCw, Plus, Search, X, ShieldAlert, Bell, BellOff,
  CheckCircle, ChevronDown, Trash2, BellRing
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────
interface SensorMetric {
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface SensorDevice {
  id: string;
  name: string;
  location: string;
  type: 'electrical' | 'environmental' | 'fluids';
  status: 'online' | 'offline';
  lastSeen: string;
  metrics: SensorMetric[];
  send_interval_seconds?: number;
  baud_rate?: number;
}

type AlertCondition = 'gt' | 'lt' | 'gte' | 'lte';
type AlertSeverity  = 'warning' | 'critical';

interface AlertRule {
  id: string;
  sensorId: string;
  sensorName: string;
  metricName: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  createdAt: string;
}

interface FiredAlert {
  id: string;
  ruleId: string;
  sensorId: string;
  sensorName: string;
  metricName: string;
  currentValue: number;
  unit: string;
  threshold: number;
  condition: AlertCondition;
  severity: AlertSeverity;
  firedAt: string;
}

// ────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────
const conditionLabel: Record<AlertCondition, string> = {
  gt:  'Mayor que (>)',
  lt:  'Menor que (<)',
  gte: 'Mayor o igual (≥)',
  lte: 'Menor o igual (≤)'
};
const conditionSymbol: Record<AlertCondition, string> = { gt: '>', lt: '<', gte: '≥', lte: '≤' };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ────────────────────────────────────────────────────
// TOAST COMPONENT
// ────────────────────────────────────────────────────
interface ToastProps { alert: FiredAlert; onDismiss: (id: string) => void; }

function AlertToast({ alert, onDismiss }: ToastProps) {
  const isCritical = alert.severity === 'critical';
  return (
    <div className={`w-full rounded-2xl border shadow-2xl backdrop-blur-md p-4 flex items-start gap-3
      animate-slide-in
      ${isCritical
        ? 'bg-red-950/90 border-red-500/50 shadow-red-900/40'
        : 'bg-yellow-950/90 border-yellow-500/50 shadow-yellow-900/40'
      }`}
    >
      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
        ${isCritical ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
        <BellRing className={`w-4 h-4 animate-pulse ${isCritical ? 'text-red-400' : 'text-yellow-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isCritical ? 'text-red-400' : 'text-yellow-400'}`}>
            {isCritical ? '🔴 Alerta Crítica' : '🟡 Advertencia'}
          </span>
          <button onClick={() => onDismiss(alert.id)} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-white text-sm font-semibold mt-0.5 truncate">{alert.sensorName}</p>
        <p className="text-gray-300 text-xs mt-0.5">
          <span className="font-mono font-bold text-white">{alert.metricName}</span>
          {' '}es{' '}
          <span className={`font-bold ${isCritical ? 'text-red-300' : 'text-yellow-300'}`}>
            {alert.currentValue} {alert.unit}
          </span>
          {' '}{conditionSymbol[alert.condition]}{' '}
          <span className="font-mono text-gray-400">{alert.threshold} {alert.unit}</span>
        </p>
        <p className="text-[10px] text-gray-500 mt-1.5 font-mono">{formatTime(alert.firedAt)}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────
// ────────────────────────────────────────────────────
// API MAPPERS (backend → tipos de UI)
// ────────────────────────────────────────────────────
function mapApiSensor(s: any): SensorDevice {
  return {
    id: s.sensor_code,
    name: s.name,
    location: s.location || 'Planta General',
    type: s.type,
    status: s.status,
    lastSeen: s.last_seen ? formatTime(s.last_seen) : 'Sin datos',
    metrics: (s.metrics || []).map((m: any) => ({
      name: m.name, value: m.value, unit: m.unit, status: m.status, trend: m.trend
    })),
    send_interval_seconds: s.send_interval_seconds || 300,
    baud_rate: s.baud_rate || 9600,
    // guardamos el id numérico interno para llamadas a reglas de alerta
    _dbId: s.id
  } as SensorDevice & { _dbId: number };
}

function mapApiRule(r: any, sensorsById: Record<number, SensorDevice>): AlertRule {
  const sensor = sensorsById[r.sensor_id];
  return {
    id: String(r.id),
    sensorId: sensor?.id ?? String(r.sensor_id),
    sensorName: sensor?.name ?? '—',
    metricName: r.metric_name,
    condition: r.condition,
    threshold: r.threshold,
    severity: r.severity,
    enabled: r.enabled,
    createdAt: r.created_at
  };
}

function mapApiFiredAlert(a: any, sensorsById: Record<number, SensorDevice>): FiredAlert {
  const sensor = sensorsById[a.sensor_id];
  return {
    id: String(a.id),
    ruleId: String(a.rule_id),
    sensorId: sensor?.id ?? String(a.sensor_id),
    sensorName: sensor?.name ?? '—',
    metricName: a.metric_name,
    currentValue: a.current_value,
    unit: a.unit,
    threshold: a.threshold,
    condition: a.condition,
    severity: a.severity,
    firedAt: a.fired_at
  };
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export default function IotTelemetry() {
  const [sensors, setSensors]               = useState<SensorDevice[]>([]);
  const [sensorsById, setSensorsById]       = useState<Record<number, SensorDevice>>({});
  const [selectedSensor, setSelectedSensor] = useState<SensorDevice | null>(null);
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterType, setFilterType]         = useState<'all' | 'electrical' | 'environmental' | 'fluids'>('all');
  const [isLoading, setIsLoading]           = useState(true);

  // Modals
  const [isAddSensorOpen,  setIsAddSensorOpen]  = useState(false);
  const [isAlertRulesOpen, setIsAlertRulesOpen] = useState(false);
  const [isAddRuleOpen,    setIsAddRuleOpen]    = useState(false);

  // New sensor form
  const [newSensorId,       setNewSensorId]       = useState('');
  const [newSensorName,     setNewSensorName]     = useState('');
  const [newSensorLocation, setNewSensorLocation] = useState('');
  const [newSensorType,     setNewSensorType]     = useState<'electrical' | 'environmental' | 'fluids'>('environmental');

  // Alert rules
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [firedAlerts, setFiredAlerts] = useState<FiredAlert[]>([]);
  const [toastAlerts, setToastAlerts] = useState<FiredAlert[]>([]);

  // New rule form
  const [ruleSensorId,   setRuleSensorId]   = useState('');
  const [ruleMetric,     setRuleMetric]     = useState('');
  const [ruleCondition,  setRuleCondition]  = useState<AlertCondition>('gt');
  const [ruleThreshold,  setRuleThreshold]  = useState('');
  const [ruleSeverity,   setRuleSeverity]   = useState<AlertSeverity>('warning');

  const [editingInterval, setEditingInterval] = useState<number>(300);
  const [editingBaud, setEditingBaud] = useState<number>(9600);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

  useEffect(() => {
    if (selectedSensor) {
      setEditingInterval(selectedSensor.send_interval_seconds || 300);
      setEditingBaud(selectedSensor.baud_rate || 9600);
    }
  }, [selectedSensor]);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSensor) return;
    setIsUpdatingConfig(true);
    const dbId = (selectedSensor as any)._dbId;
    try {
      const res = await fetch(`${API_URL}/iot/sensors/${dbId}/config`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          send_interval_seconds: Number(editingInterval),
          baud_rate: Number(editingBaud)
        })
      });
      if (res.ok) {
        const updated = await res.json();
        const mapped = mapApiSensor(updated);
        setSensors(prev => prev.map(s => s.id === mapped.id ? mapped : s));
        setSensorsById(prev => ({ ...prev, [updated.id]: mapped }));
        setSelectedSensor(mapped);
        alert("Configuración actualizada con éxito.");
      } else {
        alert("Error al actualizar la configuración.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const wsRef = useRef<WebSocket | null>(null);

  // ── Carga inicial desde backend ────────────────────
  const loadSensors = useCallback(async () => {
    const res = await fetch(`${API_URL}/iot/sensors`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const byId: Record<number, SensorDevice> = {};
    const mapped = data.map((s: any) => { const m = mapApiSensor(s); byId[s.id] = m; return m; });
    setSensors(mapped);
    setSensorsById(byId);
    setSelectedSensor(prev => {
      if (prev) {
        const match = mapped.find((s: SensorDevice) => s.id === prev.id);
        if (match) return match;
      }
      return mapped[0] ?? null;
    });
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

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const byId = await loadSensors();
      if (byId) {
        await loadRules(byId);
        await loadAlerts(byId);
      }
      setIsLoading(false);
    })();
  }, [loadSensors, loadRules, loadAlerts]);

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
          setSelectedSensor(prev => prev && prev.id === updated.id ? updated : prev);
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

  // ── Actions ───────────────────────────────────────
  const dismissToast = (id: string) => setToastAlerts(prev => prev.filter(t => t.id !== id));

  const deleteRule = async (id: string) => {
    const res = await fetch(`${API_URL}/iot/alert-rules/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) setAlertRules(prev => prev.filter(r => r.id !== id));
  };

  const toggleRule = async (id: string) => {
    const res = await fetch(`${API_URL}/iot/alert-rules/${id}/toggle`, { method: 'PATCH', headers: authHeaders() });
    if (res.ok) setAlertRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleAddSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSensorId.trim() || !newSensorName.trim()) return;
    const res = await fetch(`${API_URL}/iot/sensors`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        sensor_code: newSensorId.toUpperCase(),
        name: newSensorName,
        location: newSensorLocation || 'Planta General',
        type: newSensorType,
        metrics: getMockMetrics(newSensorType)
      })
    });
    if (!res.ok) return;
    const created = await res.json();
    const mapped = mapApiSensor(created);
    setSensors(prev => [...prev, mapped]);
    setSensorsById(prev => ({ ...prev, [created.id]: mapped }));
    setSelectedSensor(mapped);
    setIsAddSensorOpen(false);
    setNewSensorId(''); setNewSensorName(''); setNewSensorLocation('');
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleMetric || !ruleThreshold || !ruleSensorId) return;
    const dbId = (sensors.find(s => s.id === ruleSensorId) as any)?._dbId;
    if (!dbId) return;
    const res = await fetch(`${API_URL}/iot/alert-rules`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        sensor_id: dbId,
        metric_name: ruleMetric,
        condition: ruleCondition,
        threshold: Number(ruleThreshold),
        severity: ruleSeverity
      })
    });
    if (!res.ok) return;
    const created = await res.json();
    setAlertRules(prev => [...prev, mapApiRule(created, sensorsById)]);
    setIsAddRuleOpen(false);
    setRuleThreshold(''); setRuleMetric('');
  };

  // ── Helpers ───────────────────────────────────────
  const getMockMetrics = (type: 'electrical' | 'environmental' | 'fluids'): SensorMetric[] => {
    switch (type) {
      case 'electrical':    return [{ name: 'Consumo Eléctrico', value: 8.5, unit: 'kW', status: 'normal', trend: 'stable' }, { name: 'Voltaje Promedio', value: 220.2, unit: 'V', status: 'normal', trend: 'stable' }];
      case 'environmental': return [{ name: 'Temperatura Ambiente', value: 21.4, unit: '°C', status: 'normal', trend: 'stable' }, { name: 'Humedad Relativa', value: 45.0, unit: '% HR', status: 'normal', trend: 'stable' }];
      case 'fluids':        return [{ name: 'Presión en Tubería', value: 35.0, unit: 'PSI', status: 'normal', trend: 'stable' }, { name: 'Caudalímetro', value: 80.5, unit: 'L/min', status: 'normal', trend: 'stable' }];
    }
  };

  const getSensorIcon = (type: 'electrical' | 'environmental' | 'fluids') => {
    switch (type) {
      case 'electrical':    return <Zap         className="w-5 h-5 text-yellow-400" />;
      case 'environmental': return <Thermometer className="w-5 h-5 text-blue-400"   />;
      case 'fluids':        return <Gauge        className="w-5 h-5 text-cyan-400"   />;
    }
  };

  const filteredSensors = sensors.filter(sensor => {
    const s = searchTerm.toLowerCase();
    const matchSearch = sensor.name.toLowerCase().includes(s) || sensor.id.toLowerCase().includes(s) || sensor.location.toLowerCase().includes(s);
    return matchSearch && (filterType === 'all' || sensor.type === filterType);
  });

  const metricsOfRuleSensor = sensors.find(s => s.id === ruleSensorId)?.metrics ?? [];
  const activeRulesCount    = alertRules.filter(r => r.enabled).length;

  // ────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────
  return (
    <>
      {/* ─── TOAST STACK ─── */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none w-80">
        {toastAlerts.map(alert => (
          <div key={alert.id} className="pointer-events-auto">
            <AlertToast alert={alert} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* ─── MAIN LAYOUT ─── */}
      <div className="flex flex-col lg:flex-row gap-6 h-full">

        {/* ── Sidebar ── */}
        <div className="w-full lg:w-96 flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Sensores IoT
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </h1>
              <p className="text-gray-400 text-xs mt-0.5">Monitoreo de telemetría física en tiempo real.</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Bell button */}
              <button onClick={() => setIsAlertRulesOpen(true)}
                className="relative p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-xl border border-yellow-500/20 transition-all"
                title="Reglas de Alerta">
                <Bell className="w-5 h-5" />
                {activeRulesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-[#0B0F19] text-[9px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center">
                    {activeRulesCount}
                  </span>
                )}
              </button>
              {/* Add sensor button */}
              <button onClick={() => setIsAddSensorOpen(true)}
                className="p-2.5 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] rounded-xl border border-[#00F0FF]/20 transition-all"
                title="Agregar Sensor">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & filters */}
          <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Buscar por ID, nombre..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] transition-all" />
            </div>
            <div className="flex flex-wrap gap-1">
              {(['all', 'electrical', 'environmental', 'fluids'] as const).map(type => (
                <button key={type} onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterType === type
                      ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/25'
                      : 'bg-transparent text-gray-400 border border-white/5 hover:bg-white/5'
                  }`}>
                  {type === 'all' ? 'Todos' : type === 'electrical' ? 'Eléctrico' : type === 'environmental' ? 'Ambiental' : 'Fluidos'}
                </button>
              ))}
            </div>
          </div>

          {/* Sensor list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh] lg:max-h-[65vh]">
            {filteredSensors.map(sensor => {
              const hasWarning = sensor.metrics.some(m => m.status === 'warning' || m.status === 'critical');
              return (
                <div key={sensor.id} onClick={() => setSelectedSensor(sensor)}
                  className={`bg-[#161C2D] border rounded-2xl p-4 cursor-pointer hover:border-white/20 transition-all ${
                    selectedSensor?.id === sensor.id ? 'border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.05)]' : 'border-white/5'
                  }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#0B0F19] flex items-center justify-center border border-white/5">
                        {getSensorIcon(sensor.type)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">{sensor.name}</h4>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{sensor.id} • {sensor.location}</p>
                      </div>
                    </div>
                    {hasWarning && (
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
                    {sensor.metrics.slice(0, 2).map((m, idx) => (
                      <div key={idx} className="bg-[#0B0F19]/40 rounded-lg p-2 border border-white/[0.02]">
                        <p className="text-[9px] text-gray-500 truncate uppercase tracking-wider">{m.name}</p>
                        <p className={`text-xs font-bold mt-0.5 ${m.status === 'critical' ? 'text-red-400' : m.status === 'warning' ? 'text-yellow-400' : 'text-white'}`}>
                          {m.value} {m.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="text-center py-8 bg-[#161C2D]/40 border border-white/5 rounded-2xl">
                <RefreshCw className="w-8 h-8 text-gray-600 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-400 font-semibold">Cargando sensores…</p>
              </div>
            )}
            {!isLoading && filteredSensors.length === 0 && (
              <div className="text-center py-8 bg-[#161C2D]/40 border border-white/5 rounded-2xl">
                <Cpu className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-semibold">No se encontraron sensores</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className="flex-1 flex flex-col">
          {selectedSensor ? (
            <div className="bg-[#161C2D] border border-white/5 rounded-3xl p-6 lg:p-8 flex flex-col h-full space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B0F19] flex items-center justify-center border border-white/10 shadow-lg">
                    {getSensorIcon(selectedSensor.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white leading-tight">{selectedSensor.name}</h2>
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">ACTIVO</span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-1">{selectedSensor.id} • {selectedSensor.location}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00F0FF]" /> Actualizado: {selectedSensor.lastSeen}
                </span>
              </div>

              {/* Configuración del Sensor */}
              <form onSubmit={handleUpdateConfig} className="bg-[#0B0F19] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-end gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Frecuencia de Envío (segundos)</label>
                    <input
                      type="number"
                      value={editingInterval}
                      onChange={e => setEditingInterval(Number(e.target.value))}
                      className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00F0FF] transition-all"
                      min={5}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Baud Rate (Modbus RTU)</label>
                    <select
                      value={editingBaud}
                      onChange={e => setEditingBaud(Number(e.target.value))}
                      className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF] transition-all"
                    >
                      <option value={1200}>1200 bps</option>
                      <option value={2400}>2400 bps</option>
                      <option value={4800}>4800 bps</option>
                      <option value={9600}>9600 bps</option>
                      <option value={19200}>19200 bps</option>
                      <option value={38400}>38400 bps</option>
                      <option value={57600}>57600 bps</option>
                      <option value={115200}>115200 bps</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingConfig}
                  className="bg-gradient-to-r from-blue-600 to-[#00F0FF] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap w-full md:w-auto"
                >
                  {isUpdatingConfig ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </form>

              {/* Metric cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedSensor.metrics.map((metric, idx) => (
                  <div key={idx} className="bg-[#0B0F19] border border-white/5 rounded-2xl p-5 relative overflow-hidden hover:border-[#00F0FF]/30 transition-all">
                    {metric.status === 'warning'  && <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />}
                    {metric.status === 'critical' && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />}
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{metric.name}</span>
                      {metric.status === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                       metric.status === 'warning'  ? <AlertTriangle className="w-4 h-4 text-yellow-400" /> : null}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-extrabold tracking-tight ${metric.status === 'critical' ? 'text-red-400' : metric.status === 'warning' ? 'text-yellow-400' : 'text-white'}`}>
                        {metric.value}
                      </span>
                      <span className="text-gray-400 text-sm font-semibold">{metric.unit}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        metric.status === 'critical' ? 'bg-red-500' : metric.status === 'warning' ? 'bg-yellow-500' : 'bg-gradient-to-r from-blue-500 to-[#00F0FF]'
                      }`} style={{ width: `${Math.min((metric.value / (metric.unit === 'PSI' ? 80 : metric.unit === '°C' ? 100 : metric.unit === 'kW' ? 25 : 800)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Telemetry stream */}
              <div className="bg-[#0B0F19] border border-white/5 rounded-2xl p-6 flex flex-col flex-1 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-white">Flujo de Telemetría Dinámico</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Monitoreo continuo vía protocolo Modbus TCP / MQTT.</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20">
                    <Activity className="w-3.5 h-3.5 animate-pulse" /> 1 Hz Stream
                  </div>
                </div>
                <div className="flex-1 flex items-end justify-between gap-1.5 h-32 pt-6">
                  {Array.from({ length: 24 }).map((_, idx) => (
                    <div key={idx}
                      className="bg-gradient-to-t from-blue-600/30 to-[#00F0FF] w-full rounded-t transition-all duration-300 hover:scale-x-110"
                      style={{ height: `${Math.floor(20 + Math.random() * 80)}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-4 pt-3 border-t border-white/5">
                  <span>Hace 1 min</span><span>Hace 30 seg</span><span>En tiempo real</span>
                </div>
              </div>

              {/* Alert summary bar */}
              <div className="bg-[#0B0F19]/40 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-yellow-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {activeRulesCount} regla{activeRulesCount !== 1 ? 's' : ''} de alerta activa{activeRulesCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {firedAlerts.length} notificaci{firedAlerts.length !== 1 ? 'ones' : 'ón'} disparada{firedAlerts.length !== 1 ? 's' : ''} en esta sesión.
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsAlertRulesOpen(true)}
                  className="text-xs font-bold text-[#00F0FF] hover:text-[#00D1FF] bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 px-4 py-2 rounded-xl transition-all border border-[#00F0FF]/10 whitespace-nowrap">
                  Gestionar Alertas
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#161C2D]/50 border border-white/5 rounded-3xl p-12 text-center">
              <Cpu className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Selecciona un sensor</h3>
              <p className="text-gray-400 max-w-sm">Haz clic sobre cualquiera de los sensores de la izquierda para monitorizar la telemetría en tiempo real.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL: Reglas de Alerta ─── */}
      {isAlertRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsAlertRulesOpen(false)} />
          <div className="bg-[#0F1524] border border-white/10 rounded-2xl w-full max-w-2xl relative z-10 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                  <Bell className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reglas de Notificación</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Alertas automáticas al superar umbrales configurados</p>
                </div>
              </div>
              <button onClick={() => setIsAlertRulesOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5 shrink-0">
              {[
                { label: 'Reglas activas',     value: alertRules.filter(r => r.enabled).length,  color: 'text-[#00F0FF]'  },
                { label: 'Reglas pausadas',    value: alertRules.filter(r => !r.enabled).length, color: 'text-gray-400'   },
                { label: 'Alertas disparadas', value: firedAlerts.length,                        color: 'text-yellow-400' }
              ].map(s => (
                <div key={s.label} className="p-4 text-center">
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Rules list + history */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {alertRules.length === 0 && (
                <div className="text-center py-10">
                  <BellOff className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No hay reglas configuradas aún.</p>
                </div>
              )}
              {alertRules.map(rule => (
                <div key={rule.id}
                  className={`bg-[#161C2D] border rounded-xl p-4 flex items-center justify-between gap-3 transition-all ${rule.enabled ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${rule.severity === 'critical' ? 'bg-red-500/15' : 'bg-yellow-500/15'}`}>
                      <AlertTriangle className={`w-4 h-4 ${rule.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{rule.sensorName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                        {rule.metricName} {conditionSymbol[rule.condition]}{' '}
                        <span className={`font-bold ${rule.severity === 'critical' ? 'text-red-300' : 'text-yellow-300'}`}>{rule.threshold}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      rule.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>{rule.severity === 'critical' ? 'Crítico' : 'Aviso'}</span>
                    <button onClick={() => toggleRule(rule.id)}
                      className={`p-1.5 rounded-lg border transition-all ${rule.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}>
                      {rule.enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => deleteRule(rule.id)}
                      className="p-1.5 rounded-lg border border-white/5 text-gray-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* History */}
              {firedAlerts.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> Historial de notificaciones
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {firedAlerts.map(fa => (
                      <div key={fa.id} className={`flex items-center gap-3 bg-[#161C2D]/60 border rounded-xl px-3 py-2 ${fa.severity === 'critical' ? 'border-red-500/15' : 'border-yellow-500/15'}`}>
                        <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${fa.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-semibold truncate">{fa.sensorName} — {fa.metricName}</p>
                          <p className="text-[10px] text-gray-500 font-mono">Valor: {fa.currentValue} {fa.unit} | {formatTime(fa.firedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 flex justify-between items-center shrink-0">
              <button onClick={() => setIsAlertRulesOpen(false)} className="text-sm text-gray-400 hover:text-white transition-colors">Cerrar</button>
              <button onClick={() => { setIsAlertRulesOpen(false); setIsAddRuleOpen(true); }}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-[#0B0F19] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
                <Plus className="w-4 h-4" /> Nueva Regla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Nueva Regla ─── */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsAddRuleOpen(false)} />
          <div className="bg-[#0F1524] border border-white/10 rounded-2xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-yellow-400" /> Nueva Regla de Alerta
              </h3>
              <button onClick={() => setIsAddRuleOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddRule} className="p-6 space-y-4">
              {/* Sensor */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sensor</label>
                <div className="relative">
                  <select value={ruleSensorId} onChange={e => { setRuleSensorId(e.target.value); setRuleMetric(''); }}
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none">
                    {sensors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
              {/* Métrica */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Métrica</label>
                <div className="relative">
                  <select required value={ruleMetric} onChange={e => setRuleMetric(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none">
                    <option value="">— Seleccionar métrica —</option>
                    {metricsOfRuleSensor.map(m => (
                      <option key={m.name} value={m.name}>{m.name} (actual: {m.value} {m.unit})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
              {/* Condición + Umbral */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Condición</label>
                  <div className="relative">
                    <select value={ruleCondition} onChange={e => setRuleCondition(e.target.value as AlertCondition)}
                      className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none text-sm">
                      {(Object.entries(conditionLabel) as [AlertCondition, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Umbral (valor)</label>
                  <input type="number" step="any" required value={ruleThreshold} onChange={e => setRuleThreshold(e.target.value)}
                    placeholder="Ej. 50"
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                </div>
              </div>
              {/* Severidad */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nivel de alerta</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['warning', 'critical'] as AlertSeverity[]).map(sev => (
                    <button key={sev} type="button" onClick={() => setRuleSeverity(sev)}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        ruleSeverity === sev
                          ? sev === 'critical' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                          : 'bg-white/5 border-white/10 text-gray-500'
                      }`}>
                      {sev === 'warning' ? '🟡 Advertencia' : '🔴 Crítico'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsAddRuleOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors border border-white/5">Cancelar</button>
                <button type="submit" disabled={!ruleMetric || !ruleThreshold}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-[#0B0F19] font-bold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Crear regla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Agregar Sensor ─── */}
      {isAddSensorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddSensorOpen(false)} />
          <div className="bg-[#161C2D] border border-white/10 rounded-2xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">Vincular Sensor IoT</h3>
              <button onClick={() => setIsAddSensorOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleAddSensor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Código o ID del Sensor</label>
                <input type="text" required value={newSensorId} onChange={e => setNewSensorId(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#00F0FF]" placeholder="Ej. MT-303-D" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre del Sensor</label>
                <input type="text" required value={newSensorName} onChange={e => setNewSensorName(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]" placeholder="Ej. Medidor de Caudal A" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ubicación física en Planta</label>
                <input type="text" value={newSensorLocation} onChange={e => setNewSensorLocation(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]" placeholder="Ej. Sótano Industrial Norte" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo de Adquisición de Datos</label>
                <select value={newSensorType} onChange={e => setNewSensorType(e.target.value as any)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]">
                  <option value="environmental">Variables Ambientales (°C, %HR, CO2)</option>
                  <option value="electrical">Eléctrico (kW, Voltaje, FP)</option>
                  <option value="fluids">Presión y Fluidos (PSI, Caudal)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddSensorOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors border border-white/5">Cancelar</button>
                <button type="submit" disabled={!newSensorId.trim() || !newSensorName.trim()}
                  className="flex-1 bg-[#00F0FF] hover:bg-[#00D1FF] text-[#0B0F19] font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">Vincular</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
