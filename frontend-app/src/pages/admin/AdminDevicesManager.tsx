import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Monitor, Cpu, RefreshCw, Settings2 } from 'lucide-react';

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'screens' | 'sensors'>('screens');
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<IotSensor[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
          onClick={() => setActiveTab('screens')}
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
          onClick={() => setActiveTab('sensors')}
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
        <div className="bg-[#0d121f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
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
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{s.name || 'Sin Nombre'}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{s.sensor_code}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{s.location || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{s.last_seen || '—'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/admin/sensors/${s.id}`)}
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
      )}
    </div>
  );
}
