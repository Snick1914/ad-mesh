import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2 } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { Cpu } from 'lucide-react';
import { API_URL, authHeaders, mapApiSensor } from './sensorsApi';

export default function SensorConfig() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sensor, setSensor] = useState<ReturnType<typeof mapApiSensor> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editingInterval, setEditingInterval] = useState<number>(300);
  const [editingBaud, setEditingBaud] = useState<number>(9600);
  const [editingTempUnit, setEditingTempUnit] = useState<string>('C');
  const [editingAlertEmail, setEditingAlertEmail] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchSensor = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/iot/sensors`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const found = data.find((s: any) => String(s.id) === id);
        if (found) {
          const mapped = mapApiSensor(found);
          setSensor(mapped);
          setEditingInterval(Math.round((mapped.send_interval_seconds || 300) / 60));
          setEditingBaud(mapped.baud_rate || 9600);
          setEditingTempUnit(mapped.temperature_unit || 'C');
          setEditingAlertEmail(mapped.alert_email || '');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sensor) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/iot/sensors/${sensor._dbId}/config`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          send_interval_seconds: Number(editingInterval) * 60,
          baud_rate: Number(editingBaud),
          temperature_unit: editingTempUnit,
          alert_email: editingAlertEmail,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSensor(mapApiSensor(updated));
        alert('Configuración actualizada con éxito.');
      } else {
        alert('Error al actualizar la configuración.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sensor) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/sensors')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" /> Volver a Sensores
        </button>
        <EmptyState icon={<Cpu />} title="Sensor no encontrado" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <button onClick={() => navigate('/sensors')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a Sensores
        </button>
        <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          {sensor.name}
        </h1>
        <p className="text-sm text-gray-400 mt-1 font-mono">{sensor.id} • {sensor.location}</p>
      </div>

      <div className="bg-[#161C2D] border border-white/5 rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-bold text-base flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[#00F0FF]" />
          Configuración de Hardware
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Frecuencia de Envío (minutos)</label>
            <input
              type="number"
              value={editingInterval}
              onChange={e => setEditingInterval(Number(e.target.value))}
              className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00F0FF] transition-all"
              min={1}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Baud Rate (Modbus RTU)</label>
            <select
              value={editingBaud}
              onChange={e => setEditingBaud(Number(e.target.value))}
              className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF] transition-all"
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
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Unidad de Temperatura</label>
            <select
              value={editingTempUnit}
              onChange={e => setEditingTempUnit(e.target.value)}
              className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF] transition-all"
            >
              <option value="C">Celsius (°C)</option>
              <option value="F">Fahrenheit (°F)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Correo para Notificaciones de Alertas</label>
            <input
              type="email"
              value={editingAlertEmail}
              onChange={e => setEditingAlertEmail(e.target.value)}
              placeholder="ej. responsable@empresa.com (opcional)"
              className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF] transition-all"
            />
            <p className="text-[11px] text-gray-500 mt-1">Si se deja vacío, las alertas se enviarán al correo principal de la cuenta.</p>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-blue-600 to-[#00F0FF] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg"
          >
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </form>
      </div>
    </div>
  );
}
