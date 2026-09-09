import { useState } from 'react';
import { FileSpreadsheet, Download, CheckSquare, Square, Filter, Calendar } from 'lucide-react';
import Modal from '../../components/Modal';
import { SensorDevice, FiredAlert, AlertRule, TelemetryRecord } from './sensorsApi';
import { exportSensorsReportToExcel } from './exportReportHelper';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  sensors: SensorDevice[];
  firedAlerts: FiredAlert[];
  alertRules: AlertRule[];
  telemetryHistory?: TelemetryRecord[];
}

export default function ExportReportModal({
  open,
  onClose,
  sensors,
  firedAlerts,
  alertRules,
  telemetryHistory = [],
}: ExportModalProps) {
  const [selectedSensorCodes, setSelectedSensorCodes] = useState<string[]>(['ALL']);
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const isAllSelected = selectedSensorCodes.includes('ALL');

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedSensorCodes([]);
    } else {
      setSelectedSensorCodes(['ALL']);
    }
  };

  const toggleSensor = (code: string) => {
    if (isAllSelected) {
      const allCodes = sensors.map((s) => s.id);
      setSelectedSensorCodes(allCodes.filter((c) => c !== code));
      return;
    }

    if (selectedSensorCodes.includes(code)) {
      setSelectedSensorCodes((prev) => prev.filter((c) => c !== code));
    } else {
      const next = [...selectedSensorCodes, code];
      if (next.length === sensors.length) {
        setSelectedSensorCodes(['ALL']);
      } else {
        setSelectedSensorCodes(next);
      }
    }
  };

  const isSensorChecked = (code: string) => {
    return isAllSelected || selectedSensorCodes.includes(code);
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportSensorsReportToExcel({
        sensors,
        firedAlerts,
        alertRules,
        telemetryHistory,
        selectedSensorIds: selectedSensorCodes,
        onlyCritical,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Error al exportar:', err);
      alert('Error al generar el reporte Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Filtro por fecha para conteo previo
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

  // Conteo previo estimado
  const targetSensorCodes = new Set(
    isAllSelected ? sensors.map((s) => s.id) : selectedSensorCodes
  );

  const previewHistoryCount = telemetryHistory.filter((t) => {
    if (!targetSensorCodes.has(t.sensorCode)) return false;
    if (!isWithinDateRange(t.createdAt)) return false;
    return true;
  }).length;

  const previewAlertsCount = firedAlerts.filter((a) => {
    if (!targetSensorCodes.has(a.sensorId)) return false;
    if (onlyCritical && a.severity !== 'critical') return false;
    if (!isWithinDateRange(a.firedAt)) return false;
    return true;
  }).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exportar Reporte Excel"
      subtitle="Descarga el historial de telemetría, alertas y estados de tus equipos"
      icon={<FileSpreadsheet className="w-5 h-5 text-emerald-400" />}
      maxWidth="lg"
      zIndex={65}
    >
      <div className="p-6 space-y-6">
        {/* Filtro de severidad */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#00F0FF]" />
            Tipo de datos a incluir
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOnlyCritical(false)}
              className={`p-3 rounded-xl border text-left transition-all ${
                !onlyCritical
                  ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-white shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                  : 'bg-[#0B0F19] border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <p className="text-xs font-bold text-white">Todos los Datos</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Incluye lecturas normales, avisos y eventos críticos.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setOnlyCritical(true)}
              className={`p-3 rounded-xl border text-left transition-all ${
                onlyCritical
                  ? 'bg-red-500/15 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                  : 'bg-[#0B0F19] border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <p className="text-xs font-bold text-red-400">Solo Críticos</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Filtra únicamente los registros que superaron el umbral crítico.
              </p>
            </button>
          </div>
        </div>

        {/* Rango de Fechas */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#00F0FF]" />
              Rango de Fechas (Opcional)
            </label>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                Limpiar fechas
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF] transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Selección de dispositivos */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Dispositivos / Sensores ({sensors.length})
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-[#00F0FF] hover:underline font-semibold"
            >
              {isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>

          <div className="bg-[#0B0F19] border border-white/5 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1">
            {sensors.map((sensor) => {
              const checked = isSensorChecked(sensor.id);
              return (
                <div
                  key={sensor.id}
                  onClick={() => toggleSensor(sensor.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    checked ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-[#00F0FF] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{sensor.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {sensor.id} • {sensor.location}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      sensor.status === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {sensor.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview badge */}
        <div className="bg-[#161C2D] border border-white/5 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Sensores / Dispositivos a exportar:</span>
            <span className="font-bold text-white font-mono bg-white/10 px-2.5 py-0.5 rounded-md">
              {targetSensorCodes.size} de {sensors.length}
            </span>
          </div>
          {!onlyCritical && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Registros de telemetría:</span>
              <span className="font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                {previewHistoryCount > 0 ? previewHistoryCount : targetSensorCodes.size} lecturas
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Historial de alertas disparadas:</span>
            <span className="font-bold text-[#00F0FF] font-mono bg-[#00F0FF]/10 px-2.5 py-0.5 rounded-md border border-[#00F0FF]/20">
              {previewAlertsCount} eventos
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors border border-white/5 text-xs uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || (!isAllSelected && selectedSensorCodes.length === 0)}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generando Excel...' : 'Descargar Excel'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
