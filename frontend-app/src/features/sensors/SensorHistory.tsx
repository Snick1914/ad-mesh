import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, Search, Filter, ArrowLeft, RefreshCw, FileSpreadsheet,
  Clock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useSensorsData } from './useSensorsData';
import AlertToastStack from './AlertToastStack';
import ExportReportModal from './ExportReportModal';

const ROWS_PER_PAGE = 25;

export default function SensorHistory() {
  const navigate = useNavigate();
  const {
    sensors,
    telemetryHistory,
    firedAlerts,
    alertRules,
    toastAlerts,
    dismissToast,
    isLoading,
    reloadAll,
  } = useSensorsData();

  const [selectedSensorCode, setSelectedSensorCode] = useState<string>('ALL');
  const [selectedMetric, setSelectedMetric] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Lista de todas las métricas únicas disponibles
  const allMetricNames = useMemo(() => {
    const names = new Set<string>();
    telemetryHistory.forEach(t => {
      t.metrics.forEach(m => {
        if (m.name) names.add(m.name);
      });
    });
    sensors.forEach(s => {
      s.metrics.forEach(m => {
        if (m.name) names.add(m.name);
      });
    });
    return Array.from(names);
  }, [telemetryHistory, sensors]);

  // Filtrado de registros
  const filteredHistory = useMemo(() => {
    const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endTimestamp = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

    return telemetryHistory.filter(record => {
      // Filtro por sensor
      if (selectedSensorCode !== 'ALL' && record.sensorCode !== selectedSensorCode) {
        return false;
      }

      // Filtro por métrica
      if (selectedMetric !== 'ALL') {
        const hasMetric = record.metrics.some(m => m.name === selectedMetric);
        if (!hasMetric) return false;
      }

      // Filtro por fecha
      const time = new Date(record.createdAt).getTime();
      if (startTimestamp && time < startTimestamp) return false;
      if (endTimestamp && time > endTimestamp) return false;

      // Filtro por búsqueda de texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const sensorMatch = (record.sensorName || '').toLowerCase().includes(query) ||
                            (record.sensorCode || '').toLowerCase().includes(query);
        const metricMatch = record.metrics.some(m =>
          m.name.toLowerCase().includes(query) || String(m.value).includes(query)
        );
        if (!sensorMatch && !metricMatch) return false;
      }

      return true;
    });
  }, [telemetryHistory, selectedSensorCode, selectedMetric, startDate, endDate, searchTerm]);

  // Paginación
  const totalPages = Math.ceil(filteredHistory.length / ROWS_PER_PAGE) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredHistory.slice(start, start + ROWS_PER_PAGE);
  }, [filteredHistory, currentPage]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await reloadAll();
    setIsRefreshing(false);
  };

  // Métricas agregadas rápidas
  const totalReadings = filteredHistory.length;
  const uniqueSensorsCount = new Set(filteredHistory.map(r => r.sensorCode)).size;

  return (
    <>
      <AlertToastStack alerts={toastAlerts} onDismiss={dismissToast} />

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Encabezado */}
        <div>
          <button
            onClick={() => navigate('/sensors')}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Sensores
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#00F0FF]/10 text-[#00F0FF] rounded-xl border border-[#00F0FF]/20">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                    Historial de Métricas y Telemetría
                  </h1>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Registro detallado de lecturas reportadas por los sensores y dispositivos físicos.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-stretch md:self-auto">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="flex items-center justify-center gap-2 bg-[#161C2D] hover:bg-white/10 text-gray-300 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/10 transition-all disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00F0FF]' : ''}`} />
                Actualizar
              </button>

              <button
                onClick={() => setIsExportOpen(true)}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-lg shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
              </button>
            </div>
          </div>
        </div>

        {/* Resumen de KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Lecturas</p>
            <p className="text-2xl font-extrabold text-[#00F0FF] mt-1">{totalReadings.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">con filtros actuales</p>
          </div>
          <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dispositivos</p>
            <p className="text-2xl font-extrabold text-white mt-1">{uniqueSensorsCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">sensores con registros</p>
          </div>
          <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Métricas Distintas</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">{allMetricNames.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">parámetros monitoreados</p>
          </div>
          <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Páginas</p>
            <p className="text-2xl font-extrabold text-gray-300 mt-1">{currentPage} / {totalPages}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{ROWS_PER_PAGE} filas por página</p>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest pb-1 border-b border-white/5">
            <Filter className="w-3.5 h-3.5 text-[#00F0FF]" /> Filtros de Búsqueda
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Buscador */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Búsqueda Rápida
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Sensor, métrica, valor..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                />
              </div>
            </div>

            {/* Selector de Sensor */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Sensor / Dispositivo
              </label>
              <select
                value={selectedSensorCode}
                onChange={e => { setSelectedSensorCode(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
              >
                <option value="ALL">Todos los sensores ({sensors.length})</option>
                {sensors.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Métrica */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Métrica
              </label>
              <select
                value={selectedMetric}
                onChange={e => { setSelectedMetric(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
              >
                <option value="ALL">Todas las métricas</option>
                {allMetricNames.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Rango de Fechas */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Rango de Fechas
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                />
                <span className="text-gray-500 text-xs">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                />
              </div>
            </div>
          </div>

          {(searchTerm || selectedSensorCode !== 'ALL' || selectedMetric !== 'ALL' || startDate || endDate) && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSensorCode('ALL');
                  setSelectedMetric('ALL');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className="text-xs text-[#00F0FF] hover:underline"
              >
                Limpiar todos los filtros
              </button>
            </div>
          )}
        </div>

        {/* Tabla de Resultados */}
        <div className="bg-[#161C2D] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B0F19]/80 border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Fecha y Hora</th>
                  <th className="py-3.5 px-4">Sensor / Dispositivo</th>
                  <th className="py-3.5 px-4">Código Hardware</th>
                  <th className="py-3.5 px-4">Lecturas Registradas</th>
                  <th className="py-3.5 px-4 text-right">Métricas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="font-semibold text-sm">No se encontraron registros de telemetría.</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Intenta ajustar los filtros de fecha o seleccionar otro sensor.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map(record => (
                    <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-300 whitespace-nowrap">
                        {new Date(record.createdAt).toLocaleString('es-MX', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                        {record.sensorName || record.sensorCode}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-400 text-[11px] whitespace-nowrap">
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                          {record.sensorCode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {record.metrics.map((m, idx) => {
                            const isHighlighted = selectedMetric !== 'ALL' && m.name === selectedMetric;
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
                                  isHighlighted
                                    ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF] font-bold'
                                    : 'bg-[#0B0F19] border-white/10 text-gray-200'
                                }`}
                              >
                                <span className="text-gray-400 font-sans text-[10px] uppercase">{m.name}:</span>
                                <span className="font-bold text-white">{typeof m.value === 'number' ? m.value.toFixed(2) : m.value}</span>
                                <span className="text-gray-400 text-[10px]">{m.unit}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-500">
                        {record.metrics.length}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="p-4 bg-[#0B0F19]/60 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
              <div>
                Mostrando{' '}
                <span className="font-bold text-white">
                  {(currentPage - 1) * ROWS_PER_PAGE + 1}
                </span>{' '}
                a{' '}
                <span className="font-bold text-white">
                  {Math.min(currentPage * ROWS_PER_PAGE, filteredHistory.length)}
                </span>{' '}
                de <span className="font-bold text-white">{filteredHistory.length}</span> registros
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#00F0FF] text-[#0B0F19]'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Exportación Excel */}
      <ExportReportModal
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        sensors={sensors}
        firedAlerts={firedAlerts}
        alertRules={alertRules}
        telemetryHistory={telemetryHistory}
      />
    </>
  );
}
