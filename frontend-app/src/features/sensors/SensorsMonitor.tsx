import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu, Activity, Zap, Thermometer, Gauge, AlertTriangle,
  RefreshCw, Plus, Search, ShieldAlert, Settings2,
} from 'lucide-react';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { useSensorsData } from './useSensorsData';
import AlertToastStack from './AlertToastStack';
import { API_URL, authHeaders, mapApiSensor, getMockMetrics, SensorMetric } from './sensorsApi';

const getSensorIcon = (type: string) => {
  switch (type) {
    case 'electrical':    return <Zap         className="w-5 h-5 text-yellow-400" />;
    case 'temperature':   return <Thermometer className="w-5 h-5 text-orange-400" />;
    case 'environmental': return <Thermometer className="w-5 h-5 text-blue-400"   />;
    case 'water':         return <Gauge        className="w-5 h-5 text-cyan-400"   />;
    case 'gas':           return <Activity     className="w-5 h-5 text-green-400"  />;
    case 'fluids':        return <Gauge        className="w-5 h-5 text-cyan-400"   />;
    default:              return <Cpu          className="w-5 h-5 text-gray-400"   />;
  }
};

export default function SensorsMonitor() {
  const navigate = useNavigate();
  const {
    sensors, setSensors, setSensorsById,
    alertRules, firedAlerts, toastAlerts, dismissToast,
    isLoading,
  } = useSensorsData();

  const [selectedSensor, setSelectedSensor] = useState<ReturnType<typeof mapApiSensor> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'electrical' | 'environmental' | 'fluids'>('all');
  const [isAddSensorOpen, setIsAddSensorOpen] = useState(false);

  const [newSensorId, setNewSensorId] = useState('');
  const [newSensorName, setNewSensorName] = useState('');
  const [newSensorLocation, setNewSensorLocation] = useState('');
  const [newSensorType, setNewSensorType] = useState<'electrical' | 'environmental' | 'fluids'>('environmental');

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
        metrics: getMockMetrics(newSensorType),
      }),
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

  const filteredSensors = sensors.filter(sensor => {
    const s = searchTerm.toLowerCase();
    const matchSearch = sensor.name.toLowerCase().includes(s) || sensor.id.toLowerCase().includes(s) || sensor.location.toLowerCase().includes(s);
    return matchSearch && (filterType === 'all' || sensor.type === filterType);
  });

  const activeRulesCount = alertRules.filter(r => r.enabled).length;
  const activeSensor = selectedSensor ? sensors.find(s => s.id === selectedSensor.id) ?? selectedSensor : null;

  return (
    <>
      <AlertToastStack alerts={toastAlerts} onDismiss={dismissToast} />

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
            <button onClick={() => setIsAddSensorOpen(true)}
              className="p-2.5 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] rounded-xl border border-[#00F0FF]/20 transition-all"
              title="Agregar Sensor">
              <Plus className="w-5 h-5" />
            </button>
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
                    activeSensor?.id === sensor.id ? 'border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.05)]' : 'border-white/5'
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
          {activeSensor ? (
            <div className="bg-[#161C2D] border border-white/5 rounded-3xl p-6 lg:p-8 flex flex-col h-full space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B0F19] flex items-center justify-center border border-white/10 shadow-lg">
                    {getSensorIcon(activeSensor.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white leading-tight">{activeSensor.name}</h2>
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">ACTIVO</span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-1">{activeSensor.id} • {activeSensor.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00F0FF]" /> Actualizado: {activeSensor.lastSeen}
                  </span>
                  <button
                    onClick={() => navigate(`/sensors/${activeSensor._dbId}/config`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-lg transition-all border border-white/10"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Configurar
                  </button>
                </div>
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeSensor.metrics.map((metric: SensorMetric, idx: number) => (
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

              {/* Alert summary bar */}
              <div className="bg-[#0B0F19]/40 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
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
                <button onClick={() => navigate('/sensors/alerts')}
                  className="text-xs font-bold text-[#00F0FF] hover:text-[#00D1FF] bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 px-4 py-2 rounded-xl transition-all border border-[#00F0FF]/10 whitespace-nowrap">
                  Gestionar Alertas
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Cpu />}
              title="Selecciona un sensor"
              description="Haz clic sobre cualquiera de los sensores de la izquierda para monitorizar la telemetría en tiempo real."
            />
          )}
        </div>
      </div>

      {/* Modal: Agregar Sensor */}
      <Modal
        open={isAddSensorOpen}
        onClose={() => setIsAddSensorOpen(false)}
        title="Vincular Sensor IoT"
      >
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
      </Modal>
    </>
  );
}
