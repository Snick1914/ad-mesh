export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface SensorMetric {
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

export interface SensorDevice {
  id: string;
  name: string;
  location: string;
  type: string;
  status: 'online' | 'offline';
  lastSeen: string;
  lastSeenIso: string | null;
  metrics: SensorMetric[];
  send_interval_seconds?: number;
  baud_rate?: number;
  temperature_unit?: string;
  alert_email?: string;
  _dbId: number;
}

export type AlertCondition = 'gt' | 'lt' | 'gte' | 'lte';
export type AlertSeverity = 'warning' | 'critical';

export interface AlertRule {
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

export interface FiredAlert {
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

export const conditionLabel: Record<AlertCondition, string> = {
  gt: 'Mayor que (>)',
  lt: 'Menor que (<)',
  gte: 'Mayor o igual (≥)',
  lte: 'Menor o igual (≤)',
};
export const conditionSymbol: Record<AlertCondition, string> = { gt: '>', lt: '<', gte: '≥', lte: '≤' };

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function mapApiSensor(s: any): SensorDevice {
  return {
    id: s.sensor_code,
    name: s.name,
    location: s.location || 'Planta General',
    type: s.type,
    status: s.status,
    lastSeen: s.last_seen ? formatTime(s.last_seen) : 'Sin datos',
    lastSeenIso: s.last_seen || null,
    metrics: (s.metrics || []).map((m: any) => {
      let val = m.value;
      let unit = m.unit;
      const name = m.name || '';
      if (s.temperature_unit === 'F' && (name.toLowerCase().includes('temp') || (unit || '').includes('C'))) {
        val = Number((m.value * 1.8 + 32).toFixed(1));
        unit = '°F';
      }
      return { name: m.name, value: val, unit, status: m.status, trend: m.trend };
    }),
    send_interval_seconds: s.send_interval_seconds || 300,
    baud_rate: s.baud_rate || 9600,
    temperature_unit: s.temperature_unit || 'C',
    alert_email: s.alert_email || '',
    _dbId: s.id,
  };
}

export function mapApiRule(r: any, sensorsById: Record<number, SensorDevice>): AlertRule {
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
    createdAt: r.created_at,
  };
}

export function mapApiFiredAlert(a: any, sensorsById: Record<number, SensorDevice>): FiredAlert {
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
    firedAt: a.fired_at,
  };
}

export function getMockMetrics(type: 'electrical' | 'environmental' | 'fluids'): SensorMetric[] {
  switch (type) {
    case 'electrical':
      return [
        { name: 'Consumo Eléctrico', value: 8.5, unit: 'kW', status: 'normal', trend: 'stable' },
        { name: 'Voltaje Promedio', value: 220.2, unit: 'V', status: 'normal', trend: 'stable' },
      ];
    case 'environmental':
      return [
        { name: 'Temperatura Ambiente', value: 21.4, unit: '°C', status: 'normal', trend: 'stable' },
        { name: 'Humedad Relativa', value: 45.0, unit: '% HR', status: 'normal', trend: 'stable' },
      ];
    case 'fluids':
      return [
        { name: 'Presión en Tubería', value: 35.0, unit: 'PSI', status: 'normal', trend: 'stable' },
        { name: 'Caudalímetro', value: 80.5, unit: 'L/min', status: 'normal', trend: 'stable' },
      ];
  }
}
