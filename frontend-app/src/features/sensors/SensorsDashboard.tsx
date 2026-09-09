import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu, Wifi, WifiOff, Zap, Thermometer, Gauge, Activity,
  Bell, BellOff, BellRing, AlertTriangle, CheckCircle, Clock, RefreshCw, FileSpreadsheet,
} from 'lucide-react';
import KpiCard from '../../components/KpiCard';
import EmptyState from '../../components/EmptyState';
import { useSensorsData } from './useSensorsData';
import AlertToastStack from './AlertToastStack';
import ExportReportModal from './ExportReportModal';
import TelemetryTrendChart from './TelemetryTrendChart';
import { formatTime } from './sensorsApi';

const typeLabel: Record<string, string> = {
  electrical: 'Eléctrico',
  environmental: 'Ambiental',
  fluids: 'Fluidos',
  temperature: 'Temperatura',
  water: 'Agua',
  gas: 'Gas',
};

const getSensorIcon = (type: string) => {
  switch (type) {
    case 'electrical':    return <Zap         className="w-4 h-4 text-yellow-400" />;
    case 'temperature':   return <Thermometer className="w-4 h-4 text-orange-400" />;
    case 'environmental': return <Thermometer className="w-4 h-4 text-blue-400"   />;
    case 'water':         return <Gauge        className="w-4 h-4 text-cyan-400"   />;
    case 'gas':           return <Activity     className="w-4 h-4 text-green-400"  />;
    case 'fluids':        return <Gauge        className="w-4 h-4 text-cyan-400"   />;
    default:              return <Cpu          className="w-4 h-4 text-gray-400"   />;
  }
};

const STALE_MINUTES = 30;

export default function SensorsDashboard() {
  const navigate = useNavigate();
  const { sensors, alertRules, firedAlerts, telemetryHistory, toastAlerts, dismissToast, isLoading } = useSensorsData();
  const [isExportOpen, setIsExportOpen] = useState(false);

  const total = sensors.length;
  const online = sensors.filter(s => s.status === 'online').length;
  const offline = total - online;
  const availabilityPct = total > 0 ? Math.round((online / total) * 100) : 0;

  const byType = sensors.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  const activeRules = alertRules.filter(r => r.enabled).length;
  const pausedRules = alertRules.filter(r => !r.enabled).length;

  const now = Date.now();
  const last24hAlerts = firedAlerts.filter(a => now - new Date(a.firedAt).getTime() <= 24 * 60 * 60 * 1000);
  const criticalAlerts24h = last24hAlerts.filter(a => a.severity === 'critical').length;
  const warningAlerts24h = last24hAlerts.filter(a => a.severity === 'warning').length;

  const problemSensors = sensors.filter(s => {
    const hasBadMetric = s.metrics.some(m => m.status === 'warning' || m.status === 'critical');
    const isStale = s.lastSeenIso
      ? (now - new Date(s.lastSeenIso).getTime()) / 60000 > STALE_MINUTES
      : false;
    return hasBadMetric || s.status === 'offline' || isStale;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <RefreshCw className="w-10 h-10 text-[#00F0FF] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <AlertToastStack alerts={toastAlerts} onDismiss={dismissToast} />

      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Panorama General IoT
            </h1>
            <p className="text-sm text-gray-400 mt-1">Estado actual de tu flota de sensores y medidores.</p>
          </div>
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-lg shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
        </div>

        {total === 0 ? (
          <EmptyState
            icon={<Cpu />}
            title="Aún no tienes sensores"
            description="Vincula tu primer sensor desde la página de Monitoreo para empezar a ver métricas aquí."
          />
        ) : (
          <>
            {/* ── Resumen de flota ── */}
            <section className="space-y-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resumen de Flota</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={<Cpu className="w-5 h-5" />} label="Sensores totales" value={total} tone="default" />
                <KpiCard icon={<Wifi className="w-5 h-5" />} label="En línea" value={online} tone="success" />
                <KpiCard icon={<WifiOff className="w-5 h-5" />} label="Desconectados" value={offline} tone={offline > 0 ? 'danger' : 'default'} />
                <KpiCard icon={<Activity className="w-5 h-5" />} label="Disponibilidad" value={`${availabilityPct}%`} tone={availabilityPct >= 90 ? 'success' : availabilityPct >= 60 ? 'warning' : 'danger'} />
              </div>
              {Object.keys(byType).length > 0 && (
                <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-4 flex flex-wrap gap-3">
                  {Object.entries(byType).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2 bg-[#0B0F19] border border-white/5 rounded-xl px-3 py-2">
                      {getSensorIcon(type)}
                      <span className="text-xs text-gray-300 font-semibold">{typeLabel[type] || type}</span>
                      <span className="text-xs text-gray-500 font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Gráfica de Tendencia y Fluctuación ── */}
            <TelemetryTrendChart
              sensors={sensors}
              telemetryHistory={telemetryHistory}
            />

            {/* ── Estado de alertas ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Estado de Alertas</h2>
                <button onClick={() => navigate('/sensors/alerts')} className="text-xs font-bold text-[#00F0FF] hover:text-[#00D1FF] transition-colors">
                  Gestionar alertas →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={<Bell className="w-5 h-5" />} label="Reglas activas" value={activeRules} tone="info" />
                <KpiCard icon={<BellOff className="w-5 h-5" />} label="Reglas pausadas" value={pausedRules} tone="default" />
                <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Críticas (24h)" value={criticalAlerts24h} tone={criticalAlerts24h > 0 ? 'danger' : 'default'} />
                <KpiCard icon={<BellRing className="w-5 h-5" />} label="Avisos (24h)" value={warningAlerts24h} tone={warningAlerts24h > 0 ? 'warning' : 'default'} />
              </div>
            </section>

            {/* ── Sensores con problemas ── */}
            <section className="space-y-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sensores que Requieren Atención</h2>
              {problemSensors.length === 0 ? (
                <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-6 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-sm text-gray-300">Todos los sensores están en línea y dentro de rangos normales.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {problemSensors.map(s => {
                    const isStale = s.lastSeenIso ? (now - new Date(s.lastSeenIso).getTime()) / 60000 > STALE_MINUTES : false;
                    return (
                      <div
                        key={s.id}
                        onClick={() => navigate('/sensors')}
                        className="bg-[#161C2D] border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-red-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#0B0F19] flex items-center justify-center border border-white/5 shrink-0">
                            {getSensorIcon(s.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                            <p className="text-[11px] text-gray-500 font-mono">{s.id} • {s.location}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {s.status === 'offline' && (
                            <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Desconectado</span>
                          )}
                          {s.status === 'online' && isStale && (
                            <span className="text-[10px] font-bold uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">Sin reportar</span>
                          )}
                          {s.status === 'online' && !isStale && (
                            <span className="text-[10px] font-bold uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">Fuera de rango</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Feed de actividad reciente ── */}
            <section className="space-y-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Actividad Reciente</h2>
              {firedAlerts.length === 0 ? (
                <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-6 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-500 shrink-0" />
                  <p className="text-sm text-gray-400">No se han disparado alertas todavía.</p>
                </div>
              ) : (
                <div className="bg-[#161C2D] border border-white/5 rounded-2xl divide-y divide-white/5">
                  {firedAlerts.slice(0, 8).map(fa => (
                    <div key={fa.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${fa.severity === 'critical' ? 'bg-red-500/15' : 'bg-yellow-500/15'}`}>
                        <AlertTriangle className={`w-4 h-4 ${fa.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-semibold truncate">{fa.sensorName} — {fa.metricName}</p>
                        <p className="text-[11px] text-gray-500 font-mono">Valor: {fa.currentValue} {fa.unit} • {formatTime(fa.firedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

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
