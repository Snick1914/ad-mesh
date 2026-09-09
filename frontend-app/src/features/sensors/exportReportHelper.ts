import * as XLSX from 'xlsx';
import { SensorDevice, FiredAlert, AlertRule, TelemetryRecord, conditionSymbol } from './sensorsApi';

interface ExportReportOptions {
  sensors: SensorDevice[];
  firedAlerts: FiredAlert[];
  alertRules: AlertRule[];
  telemetryHistory?: TelemetryRecord[];
  selectedSensorIds: string[]; // ['ALL'] or specific sensor_code strings
  onlyCritical: boolean;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export function exportSensorsReportToExcel({
  sensors,
  firedAlerts,
  alertRules,
  telemetryHistory = [],
  selectedSensorIds,
  onlyCritical,
  startDate,
  endDate,
}: ExportReportOptions) {
  const isAll = selectedSensorIds.includes('ALL') || selectedSensorIds.length === 0;

  // Filtro por fecha base
  const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const endTimestamp = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

  const isWithinDateRange = (dateIsoOrStr: string) => {
    if (!dateIsoOrStr) return true;
    const time = new Date(dateIsoOrStr).getTime();
    if (isNaN(time)) return true;
    if (startTimestamp && time < startTimestamp) return false;
    if (endTimestamp && time > endTimestamp) return false;
    return true;
  };

  // 1. Filtrar sensores objetivo
  const targetSensors = sensors.filter(
    (s) => isAll || selectedSensorIds.includes(s.id)
  );
  const targetSensorCodes = new Set(targetSensors.map((s) => s.id));

  // 2. Filtrar alertas (eventos) por sensor, severidad y rango de fechas
  const targetAlerts = firedAlerts.filter((a) => {
    const matchSensor = isAll || targetSensorCodes.has(a.sensorId);
    if (!matchSensor) return false;
    if (onlyCritical && a.severity !== 'critical') return false;
    if (!isWithinDateRange(a.firedAt)) return false;
    return true;
  });

  // 3. Filtrar reglas
  const targetRules = alertRules.filter((r) => isAll || targetSensorCodes.has(r.sensorId));

  // 4. Filtrar registros históricos de telemetría por sensor y fecha
  const targetHistory = telemetryHistory.filter((t) => {
    const matchSensor = isAll || targetSensorCodes.has(t.sensorCode);
    if (!matchSensor) return false;
    if (!isWithinDateRange(t.createdAt)) return false;
    return true;
  });

  // Hoja 1: Historial de Lecturas y Registros
  const historyRows: any[] = [];
  if (!onlyCritical) {
    if (targetHistory.length > 0) {
      for (const h of targetHistory) {
        const dateStr = new Date(h.createdAt).toLocaleString('es-MX');
        for (const m of h.metrics) {
          historyRows.push({
            'Fecha y Hora': dateStr,
            'Código Sensor': h.sensorCode,
            'Nombre Sensor': h.sensorName || h.sensorCode,
            'Métrica': m.name,
            'Valor': m.value,
            'Unidad': m.unit || '',
            'Estado Lectura': m.status.toUpperCase(),
          });
        }
      }
    } else {
      // Si no hay histórico acumulado, incluir lectura actual si aplica rango
      for (const s of targetSensors) {
        if (!s.lastSeenIso || isWithinDateRange(s.lastSeenIso)) {
          const dateStr = s.lastSeenIso ? new Date(s.lastSeenIso).toLocaleString('es-MX') : s.lastSeen;
          for (const m of s.metrics) {
            historyRows.push({
              'Fecha y Hora': dateStr,
              'Código Sensor': s.id,
              'Nombre Sensor': s.name,
              'Métrica': m.name,
              'Valor': m.value,
              'Unidad': m.unit || '',
              'Estado Lectura': m.status.toUpperCase(),
            });
          }
        }
      }
    }
  }

  // Hoja 2: Eventos y Alertas Disparadas (Críticos / Umbral Excedido)
  const alertsData = targetAlerts.map((a) => {
    const isCrit = a.severity === 'critical';
    const condSym = conditionSymbol[a.condition] || a.condition;
    const formattedDate = new Date(a.firedAt).toLocaleString('es-MX');

    return {
      'Fecha y Hora': formattedDate,
      'Código Sensor': a.sensorId,
      'Nombre Sensor': a.sensorName,
      'Métrica Evaluada': a.metricName,
      'Valor Registrado': `${a.currentValue} ${a.unit || ''}`,
      'Umbral Configurado': `${condSym} ${a.threshold} ${a.unit || ''}`,
      'Condición': a.condition,
      'Nivel / Severidad': isCrit ? 'CRÍTICO' : 'ADVERTENCIA',
    };
  });

  // Hoja 3: Sensores e Inventario
  const sensorsData = targetSensors.map((s) => {
    const metricsStr = s.metrics
      .map((m) => `${m.name}: ${m.value} ${m.unit} (${m.status})`)
      .join(' | ');

    return {
      'Código Sensor': s.id,
      'Nombre': s.name,
      'Ubicación': s.location,
      'Tipo': s.type,
      'Estado': s.status.toUpperCase(),
      'Métricas Actuales': metricsStr || 'Sin métricas',
      'Correo Alertas': s.alert_email || 'Principal',
      'Última Conexión': s.lastSeen,
    };
  });

  // Hoja 4: Reglas de Umbral
  const rulesData = targetRules.map((r) => {
    const condSym = conditionSymbol[r.condition] || r.condition;
    return {
      'Sensor': `${r.sensorName} (${r.sensorId})`,
      'Métrica': r.metricName,
      'Condición': condSym,
      'Umbral': r.threshold,
      'Severidad': r.severity.toUpperCase(),
      'Estado': r.enabled ? 'ACTIVA' : 'PAUSADA',
    };
  });

  // Crear libro XLSX
  const wb = XLSX.utils.book_new();

  if (!onlyCritical) {
    const wsHistory = XLSX.utils.json_to_sheet(
      historyRows.length > 0
        ? historyRows
        : [{ 'Aviso': 'No hay lecturas registradas para los filtros y fechas seleccionados.' }]
    );
    XLSX.utils.book_append_sheet(wb, wsHistory, 'Registros de Telemetría');
  }

  const wsAlerts = XLSX.utils.json_to_sheet(
    alertsData.length > 0
      ? alertsData
      : [{ 'Aviso': 'No se encontraron eventos disparados para los filtros y fechas seleccionados.' }]
  );
  XLSX.utils.book_append_sheet(wb, wsAlerts, 'Eventos y Alertas');

  const wsSensors = XLSX.utils.json_to_sheet(
    sensorsData.length > 0
      ? sensorsData
      : [{ 'Aviso': 'No hay sensores seleccionados.' }]
  );
  XLSX.utils.book_append_sheet(wb, wsSensors, 'Sensores');

  const wsRules = XLSX.utils.json_to_sheet(
    rulesData.length > 0
      ? rulesData
      : [{ 'Aviso': 'No hay reglas configuradas para estos sensores.' }]
  );
  XLSX.utils.book_append_sheet(wb, wsRules, 'Reglas de Umbral');

  // Guardar archivo .xlsx
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dateRangeSuffix = startDate && endDate ? `_${startDate}_a_${endDate}` : '';
  const fileName = `Reporte_IoT_${onlyCritical ? 'Criticos' : 'Completo'}${dateRangeSuffix}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
