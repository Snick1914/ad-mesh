import { useState, useEffect } from 'react';
import { Search, Monitor, Cpu, RefreshCw, Cpu as ChipIcon, Settings2 } from 'lucide-react';

interface Device {
  id: number;
  serial_number: string;
  name: string;
  location?: string;
  status: string;
  last_seen?: string;
  is_paired: boolean;
  user_id?: number;
}

interface SensorMetric {
  name: string;
  value: number;
  unit: string;
  status: string;
}

interface IotSensor {
  id: number;
  sensor_code: string;
  name: string;
  location?: string;
  type: string;
  status: string;
  last_seen?: string;
  send_interval_seconds: number;
  baud_rate?: number;
  ota_version?: string;
  ota_file_path?: string;
  temperature_unit?: string;
  user_id?: number;
  metrics?: SensorMetric[];
}

export default function AdminDevicesManager() {
  const [activeTab, setActiveTab] = useState<'screens' | 'sensors'>('screens');
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<IotSensor[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Detail panel for configuration
  const [selectedSensor, setSelectedSensor] = useState<IotSensor | null>(null);
  const [editingInterval, setEditingInterval] = useState<number>(300);
  const [editingBaud, setEditingBaud] = useState<number>(9600);
  const [editingType, setEditingType] = useState<string>('temperature');
  const [editingTempUnit, setEditingTempUnit] = useState<string>('C');
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

  const [otaVersion, setOtaVersion] = useState('');
  const [otaFile, setOtaFile] = useState<File | null>(null);
  const [isUploadingOta, setIsUploadingOta] = useState(false);

  const apiUrl = (import.meta as any).env.VITE_API_URL || '/api/v1';

  const fetchData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      // 1. Fetch screens
      const devRes = await fetch(`${apiUrl}/devices/admin/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (devRes.ok) {
        setDevices(await devRes.json());
      }

      // 2. Fetch IoT sensors
      const sensRes = await fetch(`${apiUrl}/iot/admin/sensors/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sensRes.ok) {
        setSensors(await sensRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectSensor = (sensor: IotSensor) => {
    setSelectedSensor(sensor);
    setEditingInterval(Math.round((sensor.send_interval_seconds || 300) / 60));
    setEditingBaud(sensor.baud_rate || 9600);
    setEditingType(sensor.type || 'temperature');
    setEditingTempUnit(sensor.temperature_unit || 'C');
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSensor) return;
    setIsUpdatingConfig(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${apiUrl}/iot/sensors/${selectedSensor.id}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          send_interval_seconds: Number(editingInterval) * 60,
          baud_rate: Number(editingBaud),
          type: editingType,
          temperature_unit: editingTempUnit
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSensors(prev => prev.map(s => s.id === updated.id ? updated : s));
        setSelectedSensor(updated);
        alert("Configuración actualizada.");
      } else {
        alert("Error al guardar.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const handleUploadOta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSensor || !otaFile || !otaVersion.trim()) return;
    setIsUploadingOta(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('ota_version', otaVersion);
    formData.append('file', otaFile);

    try {
      const res = await fetch(`${apiUrl}/iot/sensors/${selectedSensor.id}/ota`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        const updated = await res.json();
        setSensors(prev => prev.map(s => s.id === updated.id ? updated : s));
        setSelectedSensor(updated);
        setOtaVersion('');
        setOtaFile(null);
        alert("Firmware OTA cargado con éxito.");
      } else {
        alert("Error al cargar.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingOta(false);
    }
  };

  const filteredDevices = devices.filter(d => 
    d.name?.toLowerCase().includes(search.toLowerCase()) || 
    d.serial_number?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSensors = sensors.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.sensor_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Gestión de Equipos
          </h1>
          <p className="text-sm text-gray-400 mt-1">Consola de control global para todas las pantallas y sensores del sistema.</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-xl border border-white/5 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Recargar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-2">
        <button
          onClick={() => { setActiveTab('screens'); setSelectedSensor(null); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'screens' 
              ? 'border-[#7000FF] text-[#b280ff]' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Pantallas ({devices.length})
        </button>
        <button
          onClick={() => { setActiveTab('sensors'); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'sensors' 
              ? 'border-[#7000FF] text-[#b280ff]' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Sensores / Medidores IoT ({sensors.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar equipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0d121f] border border-white/5 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7000FF] transition-all"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-10 h-10 text-[#7000FF] animate-spin" />
        </div>
      ) : activeTab === 'screens' ? (
        <div className="bg-[#0d121f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nombre / Serie</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4">Propietario (User ID)</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Última Conexión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
              {filteredDevices.map(d => (
                <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{d.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{d.name || 'Sin Nombre'}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{d.serial_number}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{d.location || '—'}</td>
                  <td className="px-6 py-4 font-mono text-xs">{d.user_id ? `Usuario #${d.user_id}` : 'No Asignado'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      d.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {d.status === 'online' ? 'En Línea' : 'Desconectado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{d.last_seen || '—'}</td>
                </tr>
              ))}
              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No se encontraron pantallas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${selectedSensor ? 'lg:col-span-2' : 'lg:col-span-3'} bg-[#0d121f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl h-fit`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="px-6 py-4">Código / Nombre</th>
                  <th className="px-6 py-4">Ubicación</th>
                  <th className="px-6 py-4">Última Conexión</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                {filteredSensors.map(s => (
                  <tr key={s.id} className={`hover:bg-white/[0.02] transition-colors ${selectedSensor?.id === s.id ? 'bg-[#7000FF]/5' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{s.name || 'Sin Nombre'}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{s.sensor_code}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{s.location || '—'}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{s.last_seen || '—'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleSelectSensor(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 text-xs font-semibold rounded-lg transition-all border border-blue-500/20"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        Configurar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSensors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">No se encontraron sensores.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedSensor && (
            <div className="space-y-6">
              {/* Config Form */}
              <div className="bg-[#0B0F19] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-[#00F0FF]" />
                    Configuración: {selectedSensor.name}
                  </h3>
                  <button 
                    onClick={() => setSelectedSensor(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    Cerrar
                  </button>
                </div>

                <form onSubmit={handleUpdateConfig} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Frecuencia Envío (minutos)</label>
                    <input
                      type="number"
                      value={editingInterval}
                      onChange={e => setEditingInterval(Number(e.target.value))}
                      className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00F0FF] transition-all"
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Tipo de Sensor</label>
                    <select
                      value={editingType}
                      onChange={e => setEditingType(e.target.value)}
                      className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF] transition-all"
                    >
                      <option value="temperature">Temperatura</option>
                      <option value="electrical">Eléctrico</option>
                      <option value="water">Agua</option>
                      <option value="gas">Gas</option>
                      <option value="environmental">Medio Ambiente</option>
                    </select>
                  </div>
                  {editingType === 'temperature' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Unidad de Temperatura</label>
                      <select
                        value={editingTempUnit}
                        onChange={e => setEditingTempUnit(e.target.value)}
                        className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF] transition-all"
                      >
                        <option value="C">Celsius (°C)</option>
                        <option value="F">Fahrenheit (°F)</option>
                      </select>
                    </div>
                  )}
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
                  <button
                    type="submit"
                    disabled={isUpdatingConfig}
                    className="w-full bg-gradient-to-r from-blue-600 to-[#00F0FF] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg"
                  >
                    {isUpdatingConfig ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </form>
              </div>

              {/* OTA Form */}
              <div className="bg-[#0B0F19] border border-white/5 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <ChipIcon className="w-5 h-5 text-[#7000FF]" />
                  Actualización OTA
                </h3>
                {selectedSensor.ota_version && (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-xs text-gray-400 space-y-1">
                    <div><span className="font-semibold text-white">Versión Actual OTA:</span> {selectedSensor.ota_version}</div>
                    <div className="truncate"><span className="font-semibold text-white">Archivo:</span> {selectedSensor.ota_file_path?.split('/').pop()}</div>
                  </div>
                )}
                <form onSubmit={handleUploadOta} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Nueva Versión OTA</label>
                    <input
                      type="text"
                      placeholder="Ej. 1.0.1"
                      value={otaVersion}
                      onChange={e => setOtaVersion(e.target.value)}
                      className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00F0FF] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Firmware (.bin)</label>
                    <input
                      type="file"
                      accept=".bin"
                      onChange={e => setOtaFile(e.target.files?.[0] || null)}
                      className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-4 py-1.5 text-sm text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isUploadingOta}
                    className="w-full bg-gradient-to-r from-blue-600 to-[#7000FF] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg"
                  >
                    {isUploadingOta ? 'Subiendo...' : 'Subir Firmware OTA'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
