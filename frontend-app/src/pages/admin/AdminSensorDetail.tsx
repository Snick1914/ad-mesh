import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu as ChipIcon, Settings2 } from 'lucide-react';

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
}

export default function AdminSensorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apiUrl = (import.meta as any).env.VITE_API_URL || '/api/v1';

  const [sensor, setSensor] = useState<IotSensor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editingInterval, setEditingInterval] = useState<number>(300);
  const [editingBaud, setEditingBaud] = useState<number>(9600);
  const [editingType, setEditingType] = useState<string>('temperature');
  const [editingTempUnit, setEditingTempUnit] = useState<string>('C');
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

  const [otaVersion, setOtaVersion] = useState('');
  const [otaFile, setOtaFile] = useState<File | null>(null);
  const [isUploadingOta, setIsUploadingOta] = useState(false);

  const fetchSensor = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${apiUrl}/iot/admin/sensors/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const all: IotSensor[] = await res.json();
        const found = all.find(s => String(s.id) === id) || null;
        setSensor(found);
        if (found) {
          setEditingInterval(Math.round((found.send_interval_seconds || 300) / 60));
          setEditingBaud(found.baud_rate || 9600);
          setEditingType(found.type || 'temperature');
          setEditingTempUnit(found.temperature_unit || 'C');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSensor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sensor) return;
    setIsUpdatingConfig(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${apiUrl}/iot/sensors/${sensor.id}/config`, {
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
        setSensor(updated);
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
    if (!sensor || !otaFile || !otaVersion.trim()) return;
    setIsUploadingOta(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('ota_version', otaVersion);
    formData.append('file', otaFile);

    try {
      const res = await fetch(`${apiUrl}/iot/sensors/${sensor.id}/ota`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const updated = await res.json();
        setSensor(updated);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-[#7000FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sensor) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/devices')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Gestión de Equipos
        </button>
        <p className="text-gray-500">Sensor no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <button
          onClick={() => navigate('/admin/devices')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Gestión de Equipos
        </button>
        <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          {sensor.name}
        </h1>
        <p className="text-sm text-gray-400 mt-1 font-mono">{sensor.sensor_code}</p>
      </div>

      {/* Config Form */}
      <div className="bg-[#0B0F19] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-bold text-base flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[#00F0FF]" />
          Configuración
        </h3>

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
        {sensor.ota_version && (
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-xs text-gray-400 space-y-1">
            <div><span className="font-semibold text-white">Versión Actual OTA:</span> {sensor.ota_version}</div>
            <div className="truncate"><span className="font-semibold text-white">Archivo:</span> {sensor.ota_file_path?.split('/').pop()}</div>
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
  );
}
