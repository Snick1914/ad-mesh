import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Zap, Thermometer, Gauge, AlertTriangle, RefreshCw, Plus, Search, X, ShieldAlert } from 'lucide-react';

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
}

const INITIAL_SENSORS: SensorDevice[] = [
  {
    id: 'MT-942-A',
    name: 'Sensor Compresores Principal',
    location: 'Área de Compresores y Neumática',
    type: 'fluids',
    status: 'online',
    lastSeen: 'Justo ahora',
    metrics: [
      { name: 'Presión de Aire', value: 42.5, unit: 'PSI', status: 'normal', trend: 'stable' },
      { name: 'Temperatura Cabezal', value: 68.2, unit: '°C', status: 'normal', trend: 'up' },
      { name: 'Caudal de Salida', value: 120.4, unit: 'L/min', status: 'normal', trend: 'up' }
    ]
  },
  {
    id: 'PWR-88-B',
    name: 'Analizador Red Subestación',
    location: 'Tablero General de Fuerza',
    type: 'electrical',
    status: 'online',
    lastSeen: 'Hace 5 seg',
    metrics: [
      { name: 'Consumo Eléctrico', value: 12.4, unit: 'kW', status: 'normal', trend: 'down' },
      { name: 'Voltaje L1-L2', value: 220.8, unit: 'V', status: 'normal', trend: 'stable' },
      { name: 'Factor de Potencia', value: 0.94, unit: 'FP', status: 'normal', trend: 'stable' }
    ]
  },
  {
    id: 'ENV-101-C',
    name: 'Monitor Ambiental Almacén',
    location: 'Almacén de Materia Prima',
    type: 'environmental',
    status: 'online',
    lastSeen: 'Hace 2 min',
    metrics: [
      { name: 'Temperatura Ambiente', value: 24.8, unit: '°C', status: 'normal', trend: 'up' },
      { name: 'Humedad Relativa', value: 58.5, unit: '% HR', status: 'normal', trend: 'stable' },
      { name: 'Nivel CO2', value: 420, unit: 'ppm', status: 'normal', trend: 'stable' }
    ]
  },
  {
    id: 'ENV-202-F',
    name: 'Cámara Fría Lácteos',
    location: 'Andén de Congelados',
    type: 'environmental',
    status: 'online',
    lastSeen: 'Justo ahora',
    metrics: [
      { name: 'Temperatura Interna', value: 8.4, unit: '°C', status: 'warning', trend: 'up' },
      { name: 'Humedad Relativa', value: 82.1, unit: '% HR', status: 'normal', trend: 'down' },
      { name: 'Puerta Abierta', value: 1, unit: 'Estado', status: 'warning', trend: 'stable' }
    ]
  }
];

export default function IotTelemetry() {
  const [sensors, setSensors] = useState<SensorDevice[]>(INITIAL_SENSORS);
  const [selectedSensor, setSelectedSensor] = useState<SensorDevice | null>(INITIAL_SENSORS[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'electrical' | 'environmental' | 'fluids'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSensorId, setNewSensorId] = useState('');
  const [newSensorName, setNewSensorName] = useState('');
  const [newSensorLocation, setNewSensorLocation] = useState('');
  const [newSensorType, setNewSensorType] = useState<'electrical' | 'environmental' | 'fluids'>('environmental');

  // Simulación de telemetría en tiempo real: fluctuaciones pequeñas cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prevSensors =>
        prevSensors.map(sensor => {
          if (sensor.status === 'offline') return sensor;
          
          const updatedMetrics = sensor.metrics.map(metric => {
            let val = metric.value;
            let status = metric.status;
            let trend = metric.trend;

            // Variaciones lógicas según el tipo de métrica
            if (metric.name === 'Presión de Aire') {
              val = Number((val + (Math.random() - 0.5) * 1.5).toFixed(1));
              if (val > 55) status = 'critical';
              else if (val > 48) status = 'warning';
              else status = 'normal';
            } else if (metric.name === 'Consumo Eléctrico') {
              val = Number((val + (Math.random() - 0.5) * 0.8).toFixed(1));
              trend = Math.random() > 0.5 ? 'up' : 'down';
            } else if (metric.name === 'Temperatura Interna') {
              val = Number((val + 0.1).toFixed(1)); // Sube lentamente
              if (val > 10) status = 'critical';
              else if (val > 6) status = 'warning';
              else status = 'normal';
            } else if (metric.name === 'Temperatura Ambiente' || metric.name === 'Temperatura Cabezal') {
              val = Number((val + (Math.random() - 0.5) * 0.3).toFixed(1));
            } else if (metric.name === 'Humedad Relativa') {
              val = Number((val + (Math.random() - 0.5) * 0.5).toFixed(1));
            } else if (metric.name === 'Nivel CO2') {
              val = val + Math.floor((Math.random() - 0.5) * 10);
            }

            return { ...metric, value: val, status, trend };
          });

          return {
            ...sensor,
            lastSeen: 'Justo ahora',
            metrics: updatedMetrics
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Sincronizar el sensor seleccionado para ver los cambios en tiempo real
  useEffect(() => {
    if (selectedSensor) {
      const match = sensors.find(s => s.id === selectedSensor.id);
      if (match) setSelectedSensor(match);
    }
  }, [sensors, selectedSensor]);

  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch = sensor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sensor.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sensor.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || sensor.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddSensor = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSensorId.trim() && newSensorName.trim()) {
      const newDevice: SensorDevice = {
        id: newSensorId.toUpperCase(),
        name: newSensorName,
        location: newSensorLocation || 'Planta General',
        type: newSensorType,
        status: 'online',
        lastSeen: 'Justo ahora',
        metrics: getMockMetricsForType(newSensorType)
      };

      setSensors([...sensors, newDevice]);
      setSelectedSensor(newDevice);
      setIsModalOpen(false);
      setNewSensorId('');
      setNewSensorName('');
      setNewSensorLocation('');
    }
  };

  const getMockMetricsForType = (type: 'electrical' | 'environmental' | 'fluids'): SensorMetric[] => {
    switch (type) {
      case 'electrical':
        return [
          { name: 'Consumo Eléctrico', value: 8.5, unit: 'kW', status: 'normal', trend: 'stable' },
          { name: 'Voltaje Promedio', value: 220.2, unit: 'V', status: 'normal', trend: 'stable' }
        ];
      case 'environmental':
        return [
          { name: 'Temperatura Ambiente', value: 21.4, unit: '°C', status: 'normal', trend: 'stable' },
          { name: 'Humedad Relativa', value: 45.0, unit: '% HR', status: 'normal', trend: 'stable' }
        ];
      case 'fluids':
        return [
          { name: 'Presión en Tubería', value: 35.0, unit: 'PSI', status: 'normal', trend: 'stable' },
          { name: 'Caudalímetro', value: 80.5, unit: 'L/min', status: 'normal', trend: 'stable' }
        ];
    }
  };

  const getSensorIcon = (type: 'electrical' | 'environmental' | 'fluids') => {
    switch (type) {
      case 'electrical':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'environmental':
        return <Thermometer className="w-5 h-5 text-blue-400" />;
      case 'fluids':
        return <Gauge className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar de sensores */}
      <div className="w-full lg:w-96 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Sensores IoT
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">Monitoreo de telemetría física en tiempo real.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2.5 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] rounded-xl border border-[#00F0FF]/20 transition-all"
            title="Agregar Sensor"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Búsqueda y filtros */}
        <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por ID, nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-1">
            {(['all', 'electrical', 'environmental', 'fluids'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterType === type
                    ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/25'
                    : 'bg-transparent text-gray-400 border border-white/5 hover:bg-white/5'
                }`}
              >
                {type === 'all' ? 'Todos' : type === 'electrical' ? 'Eléctrico' : type === 'environmental' ? 'Ambiental' : 'Fluidos'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Sensores */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh] lg:max-h-[65vh]">
          {filteredSensors.map((sensor) => {
            const hasWarning = sensor.metrics.some(m => m.status === 'warning' || m.status === 'critical');
            return (
              <div
                key={sensor.id}
                onClick={() => setSelectedSensor(sensor)}
                className={`bg-[#161C2D] border rounded-2xl p-4 cursor-pointer hover:border-white/20 transition-all ${
                  selectedSensor?.id === sensor.id
                    ? 'border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.05)]'
                    : 'border-white/5'
                }`}
              >
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
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
                  {sensor.metrics.slice(0, 2).map((m, idx) => (
                    <div key={idx} className="bg-[#0B0F19]/40 rounded-lg p-2 border border-white/[0.02]">
                      <p className="text-[9px] text-gray-500 truncate uppercase tracking-wider">{m.name}</p>
                      <p className={`text-xs font-bold mt-0.5 ${
                        m.status === 'critical' ? 'text-red-400' : m.status === 'warning' ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {m.value} {m.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredSensors.length === 0 && (
            <div className="text-center py-8 bg-[#161C2D]/40 border border-white/5 rounded-2xl">
              <Cpu className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-semibold">No se encontraron sensores</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel Detallado del Sensor Seleccionado */}
      <div className="flex-1 flex flex-col">
        {selectedSensor ? (
          <div className="bg-[#161C2D] border border-white/5 rounded-3xl p-6 lg:p-8 flex flex-col h-full space-y-6">
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
              
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00F0FF]" /> Actualizado: {selectedSensor.lastSeen}
                </span>
              </div>
            </div>

            {/* Tarjetas Principales de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedSensor.metrics.map((metric, idx) => (
                <div key={idx} className="bg-[#0B0F19] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-[#00F0FF]/30 transition-all">
                  {metric.status === 'warning' && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                  )}
                  {metric.status === 'critical' && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{metric.name}</span>
                    {metric.status === 'critical' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : metric.status === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    ) : null}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white tracking-tight">{metric.value}</span>
                    <span className="text-gray-400 text-sm font-semibold">{metric.unit}</span>
                  </div>

                  {/* Barra de Progreso Dinámica Simulada */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        metric.status === 'critical' ? 'bg-red-500' : metric.status === 'warning' ? 'bg-yellow-500' : 'bg-gradient-to-r from-blue-500 to-[#00F0FF]'
                      }`}
                      style={{ width: `${Math.min((metric.value / (metric.unit === 'PSI' ? 80 : metric.unit === '°C' ? 100 : metric.unit === 'kW' ? 25 : 800)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Simulación Gráfico / Telemetry Stream */}
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

              {/* Ondas SVG Decorativas Dinámicas de Gráfico */}
              <div className="flex-1 flex items-end justify-between gap-1.5 h-32 pt-6">
                {Array.from({ length: 24 }).map((_, idx) => {
                  const hValue = Math.floor(20 + Math.random() * 80);
                  return (
                    <div 
                      key={idx} 
                      className="bg-gradient-to-t from-blue-600/30 to-[#00F0FF] w-full rounded-t transition-all duration-300 hover:scale-x-110" 
                      style={{ height: `${hValue}%` }}
                    ></div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-4 pt-3 border-t border-white/5">
                <span>Hace 1 min</span>
                <span>Hace 30 seg</span>
                <span>En tiempo real</span>
              </div>
            </div>

            {/* Reglas de Alerta */}
            <div className="bg-[#0B0F19]/40 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-yellow-400" />
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold text-white">Acciones inmediatas en Red</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Alerta crítica configurada para proyectarse en la Pantalla Recepción ante sobrecarga.</p>
                </div>
              </div>
              <button className="text-xs font-bold text-[#00F0FF] hover:text-[#00D1FF] bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 px-4 py-2 rounded-xl transition-all border border-[#00F0FF]/10">
                Ver Alertas Activas
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#161C2D]/50 border border-white/5 rounded-3xl p-12 text-center">
            <Cpu className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Selecciona un sensor</h3>
            <p className="text-gray-400 max-w-sm">Haz clic sobre cualquiera de los sensores de la izquierda para monitorizar la telemetría en tiempo real de su planta.</p>
          </div>
        )}
      </div>

      {/* Modal Agregar Sensor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-[#161C2D] border border-white/10 rounded-2xl w-full max-w-md relative z-10 shadow-2xl shadow-black/50 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">Vincular Sensor IoT</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddSensor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Código o ID del Sensor</label>
                <input 
                  type="text" 
                  required
                  value={newSensorId}
                  onChange={(e) => setNewSensorId(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
                  placeholder="Ej. MT-303-D"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre del Sensor</label>
                <input 
                  type="text" 
                  required
                  value={newSensorName}
                  onChange={(e) => setNewSensorName(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
                  placeholder="Ej. Medidor de Caudal A"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ubicación física en Planta</label>
                <input 
                  type="text" 
                  value={newSensorLocation}
                  onChange={(e) => setNewSensorLocation(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
                  placeholder="Ej. Sótano Industrial Norte"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo de Adquisición de Datos</label>
                <select
                  value={newSensorType}
                  onChange={(e) => setNewSensorType(e.target.value as any)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
                >
                  <option value="environmental">Variables Ambientales (°C, %HR, CO2)</option>
                  <option value="electrical">Eléctrico (kW, Voltaje, FP)</option>
                  <option value="fluids">Presión y Fluidos (PSI, Caudal)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors border border-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newSensorId.trim() || !newSensorName.trim()}
                  className="flex-1 bg-[#00F0FF] hover:bg-[#00D1FF] text-[#0B0F19] font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
