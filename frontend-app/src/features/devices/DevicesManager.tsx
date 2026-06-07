import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, MonitorPlay, Wifi, WifiOff, RefreshCw, ServerCog, X, Loader2, Settings, Columns, Maximize, Layout, CheckCircle2, Calendar, Clock, Trash2, AlarmClock } from 'lucide-react';
import type { Device, DeviceStatus } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ──────────────────────────────────────────────────────────────────────────────
// TIPOS
// ──────────────────────────────────────────────────────────────────────────────

interface LayoutConfig {
  zone_a_height?: number;   // split-h: % de altura de zona superior
  zone_a_width?: number;    // split-v / l-shape: % de ancho de zona izquierda/principal
  top_row_height?: number;  // l-shape: % de altura del área superior
}

interface DeviceConfig {
  resolution: string;
  layout: 'single' | 'split-h' | 'split-v' | 'l-shape';
  layout_config: LayoutConfig;
  zonePlaylists: {
    zoneA: string;
    zoneB: string;
    zoneC: string;
  };
}

interface Schedule {
  id: number;
  device_id: number;
  zone: string;
  playlist_id: number;
  start_time: string;
  end_time: string;
  days_of_week: number[];
}

interface NewScheduleForm {
  zone: string;
  playlist_id: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE DÍAS
// ──────────────────────────────────────────────────────────────────────────────

const DAYS_LABELS = [
  { value: 0, label: 'D' },
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
];

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

const defaultLayoutConfig = (layout: string): LayoutConfig => {
  switch (layout) {
    case 'split-h': return { zone_a_height: 50 };
    case 'split-v': return { zone_a_width: 50 };
    case 'l-shape': return { top_row_height: 85, zone_a_width: 70 };
    default: return {};
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

export default function DevicesManager() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | DeviceStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State para Vinculación
  const [activationCode, setActivationCode] = useState('');
  const [deviceName, setDeviceName] = useState('');

  // Drawer State para Ajustes de Dispositivo
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'schedule'>('config');
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig>({
    resolution: '1920x1080',
    layout: 'single',
    layout_config: {},
    zonePlaylists: { zoneA: '', zoneB: '', zoneC: '' },
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [isUnpairing, setIsUnpairing] = useState(false);

  // Schedule State
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null);
  const [newSchedule, setNewSchedule] = useState<NewScheduleForm>({
    zone: 'A',
    playlist_id: '',
    start_time: '08:00',
    end_time: '17:00',
    days_of_week: [1, 2, 3, 4, 5],
  });

  // ────────────────────────────────────────────────────────────────────────────
  // FETCH
  // ────────────────────────────────────────────────────────────────────────────

  const fetchDevices = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/devices/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al obtener los reproductores vinculados.');
      const data = await response.json();
      const mapped = data.map((d: any) => ({
        id: String(d.id),
        serialNumber: d.serial_number,
        name: d.name || 'Sin nombre',
        status: (d.status as DeviceStatus) || 'offline',
        lastHeartbeat: d.last_heartbeat
          ? new Date(d.last_heartbeat).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
          : 'Nunca',
        storageUsed: d.storage_used_gb,
        storageTotal: d.storage_limit_gb,
        resolution: d.resolution,
        layout: d.layout,
        layout_config: d.layout_config,
        playlist_id: d.playlist_id,
        playlist_b_id: d.playlist_b_id,
        playlist_c_id: d.playlist_c_id,
      }));
      setDevices(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/playlists/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setPlaylists(await response.json());
    } catch (e) { console.warn('Error fetching playlists:', e); }
  };

  const fetchSchedules = useCallback(async (deviceId: string) => {
    setIsLoadingSchedules(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/devices/${deviceId}/schedules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setSchedules(await response.json());
      else setSchedules([]);
    } catch (e) {
      console.warn('Error fetching schedules:', e);
      setSchedules([]);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDevices();
    fetchPlaylists();
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam && codeParam.length === 6) {
      setActivationCode(codeParam.toUpperCase());
      setIsModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Al abrir el drawer de configuración de un dispositivo
  useEffect(() => {
    if (selectedDevice) {
      const existingConfig = (selectedDevice as any).layout_config;
      const layoutType = (selectedDevice.layout || 'single') as DeviceConfig['layout'];
      const parsedConfig: LayoutConfig = existingConfig
        ? existingConfig
        : defaultLayoutConfig(layoutType);

      setDeviceConfig({
        resolution: selectedDevice.resolution || '1920x1080',
        layout: layoutType,
        layout_config: parsedConfig,
        zonePlaylists: {
          zoneA: selectedDevice.playlist_id ? String(selectedDevice.playlist_id) : '',
          zoneB: selectedDevice.playlist_b_id ? String(selectedDevice.playlist_b_id) : '',
          zoneC: selectedDevice.playlist_c_id ? String(selectedDevice.playlist_c_id) : '',
        },
      });
      setConfigSuccess(false);
      setActiveTab('config');
      setSchedules([]);
    }
  }, [selectedDevice]);

  // Cargar schedules al cambiar al tab de programación
  useEffect(() => {
    if (selectedDevice && activeTab === 'schedule') {
      fetchSchedules(selectedDevice.id);
    }
  }, [activeTab, selectedDevice, fetchSchedules]);

  // Actualizar layout_config con defaults cuando cambia el layout
  const handleLayoutChange = (layout: DeviceConfig['layout']) => {
    const newConfig = defaultLayoutConfig(layout);
    setDeviceConfig({
      ...deviceConfig,
      layout,
      layout_config: newConfig,
      zonePlaylists: { zoneA: '', zoneB: '', zoneC: '' },
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // ACCIONES
  // ────────────────────────────────────────────────────────────────────────────

  const handleSaveDeviceConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    setIsSavingConfig(true);
    setConfigSuccess(false);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        resolution: deviceConfig.resolution,
        layout: deviceConfig.layout,
        layout_config: Object.keys(deviceConfig.layout_config).length > 0 ? deviceConfig.layout_config : null,
        playlist_id: deviceConfig.zonePlaylists.zoneA ? parseInt(deviceConfig.zonePlaylists.zoneA) : null,
        playlist_b_id: deviceConfig.zonePlaylists.zoneB ? parseInt(deviceConfig.zonePlaylists.zoneB) : null,
        playlist_c_id: deviceConfig.zonePlaylists.zoneC ? parseInt(deviceConfig.zonePlaylists.zoneC) : null,
      };

      const response = await fetch(`${API_URL}/devices/${selectedDevice.id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al guardar la configuración.');
      }

      setConfigSuccess(true);
      await fetchDevices();
      setTimeout(() => {
        setConfigSuccess(false);
        setSelectedDevice(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !newSchedule.playlist_id) return;
    setIsCreatingSchedule(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/devices/${selectedDevice.id}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          zone: newSchedule.zone,
          playlist_id: parseInt(newSchedule.playlist_id),
          start_time: `${newSchedule.start_time}:00`,
          end_time: `${newSchedule.end_time}:00`,
          days_of_week: newSchedule.days_of_week,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al crear la programación.');
      }
      await fetchSchedules(selectedDevice.id);
      setNewSchedule({ zone: 'A', playlist_id: '', start_time: '08:00', end_time: '17:00', days_of_week: [1, 2, 3, 4, 5] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!selectedDevice) return;
    setDeletingScheduleId(scheduleId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/devices/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al eliminar la programación.');
      await fetchSchedules(selectedDevice.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingScheduleId(null);
    }
  };

  const handleUnpairDevice = async () => {
    if (!selectedDevice) return;
    if (!window.confirm(`¿Estás seguro de que deseas desvincular la pantalla "${selectedDevice.name}"? Se borrarán todos sus archivos descargados y volverá al estado de fábrica.`)) return;
    setIsUnpairing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/devices/${selectedDevice.id}/unpair`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al desvincular la pantalla.');
      setSelectedDevice(null);
      await fetchDevices();
    } catch (err: any) {
      setError(err.message || 'Error al desvincular la pantalla.');
    } finally {
      setIsUnpairing(false);
    }
  };

  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activationCode.length === 6 && deviceName.trim()) {
      setIsLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/devices/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ pairing_code: activationCode, name: deviceName }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Error al vincular el reproductor.');
        setIsModalOpen(false);
        setActivationCode('');
        setDeviceName('');
        await fetchDevices();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleDay = (day: number) => {
    const days = newSchedule.days_of_week;
    setNewSchedule({
      ...newSchedule,
      days_of_week: days.includes(day) ? days.filter(d => d !== day) : [...days, day],
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // HELPERS UI
  // ────────────────────────────────────────────────────────────────────────────

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case 'online':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20"><Wifi className="w-3 h-3" /> Online</span>;
      case 'offline':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><WifiOff className="w-3 h-3" /> Offline</span>;
      case 'syncing':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20"><ServerCog className="w-3 h-3" /> Mantenimiento</span>;
    }
  };

  const getLayoutName = (layout: string) => {
    switch (layout) {
      case 'single': return 'Pantalla Completa';
      case 'split-h': return 'Dividido Horizontal';
      case 'split-v': return 'Dividido Vertical';
      case 'l-shape': return 'Diseño en L (Multi-Zona)';
      default: return 'No asignado';
    }
  };

  const getPlaylistName = (id: number | string | null) => {
    if (!id) return 'Sin asignar';
    const p = playlists.find(pl => String(pl.id) === String(id));
    return p ? p.name : `Playlist #${id}`;
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CANVAS BLUEPRINT con proporciones dinámicas
  // ────────────────────────────────────────────────────────────────────────────

  const renderLayoutBlueprint = (
    layoutType: DeviceConfig['layout'],
    config: LayoutConfig = {},
    previewMode = false
  ) => {
    const baseClass = `bg-[#0B0F19] rounded-xl border border-dashed border-white/15 w-full flex overflow-hidden relative ${previewMode ? 'h-16' : 'h-44'}`;

    switch (layoutType) {
      case 'single':
        return (
          <div className={baseClass}>
            <div className="flex-1 bg-[#00F0FF]/5 hover:bg-[#00F0FF]/10 transition-colors flex flex-col items-center justify-center text-xs font-bold text-[#00F0FF] p-2 text-center">
              <Maximize className="w-4 h-4 mb-1" />
              <span>Zona A (100%)</span>
            </div>
          </div>
        );

      case 'split-h': {
        const aH = config.zone_a_height ?? 50;
        const bH = 100 - aH;
        return (
          <div className={`${baseClass} flex-col`}>
            <div
              className="border-b border-white/10 bg-blue-500/5 hover:bg-blue-500/10 transition-all flex items-center justify-center text-[10px] font-bold text-blue-400"
              style={{ height: `${aH}%` }}
            >
              Zona A ({aH}%)
            </div>
            <div
              className="bg-indigo-500/5 hover:bg-indigo-500/10 transition-all flex items-center justify-center text-[10px] font-bold text-indigo-400"
              style={{ height: `${bH}%` }}
            >
              Zona B ({bH}%)
            </div>
          </div>
        );
      }

      case 'split-v': {
        const aW = config.zone_a_width ?? 50;
        const bW = 100 - aW;
        return (
          <div className={baseClass}>
            <div
              className="border-r border-white/10 bg-purple-500/5 hover:bg-purple-500/10 transition-all flex items-center justify-center text-[10px] font-bold text-purple-400"
              style={{ width: `${aW}%` }}
            >
              A ({aW}%)
            </div>
            <div
              className="bg-pink-500/5 hover:bg-pink-500/10 transition-all flex items-center justify-center text-[10px] font-bold text-pink-400"
              style={{ width: `${bW}%` }}
            >
              B ({bW}%)
            </div>
          </div>
        );
      }

      case 'l-shape': {
        const topH = config.top_row_height ?? 85;
        const botH = 100 - topH;
        const aW = config.zone_a_width ?? 70;
        const bW = 100 - aW;
        return (
          <div className={`${baseClass} flex-col`}>
            <div className="flex gap-0" style={{ height: `${topH}%` }}>
              <div
                className="border-r border-b border-white/10 bg-[#00F0FF]/5 hover:bg-[#00F0FF]/10 transition-all flex items-center justify-center text-[9px] font-bold text-[#00F0FF]"
                style={{ width: `${aW}%` }}
              >
                A ({aW}%)
              </div>
              <div
                className="border-b border-white/10 bg-amber-500/5 hover:bg-amber-500/10 transition-all flex items-center justify-center text-[9px] font-bold text-amber-400 text-center px-1"
                style={{ width: `${bW}%` }}
              >
                B ({bW}%)
              </div>
            </div>
            <div
              className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-all flex items-center justify-center text-[9px] font-bold text-emerald-400 w-full"
              style={{ height: `${botH}%` }}
            >
              C — Cintillo ({botH}%)
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SLIDERS DE PROPORCIONES
  // ────────────────────────────────────────────────────────────────────────────

  const renderLayoutSliders = () => {
    const { layout, layout_config } = deviceConfig;

    if (layout === 'single') return null;

    const updateConfig = (key: keyof LayoutConfig, value: number) => {
      setDeviceConfig(prev => ({ ...prev, layout_config: { ...prev.layout_config, [key]: value } }));
    };

    if (layout === 'split-h') {
      const val = layout_config.zone_a_height ?? 50;
      return (
        <div className="space-y-3 pt-3 border-t border-white/5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Columns className="w-3.5 h-3.5 rotate-90 text-blue-400" />
              Proporción Horizontal
            </label>
            <span className="text-xs font-mono text-blue-400">{val}% / {100 - val}%</span>
          </div>
          <input
            type="range" min={10} max={90} value={val}
            onChange={e => updateConfig('zone_a_height', Number(e.target.value))}
            className="w-full accent-[#00F0FF] h-2 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>Zona A (Superior)</span>
            <span>Zona B (Inferior)</span>
          </div>
        </div>
      );
    }

    if (layout === 'split-v') {
      const val = layout_config.zone_a_width ?? 50;
      return (
        <div className="space-y-3 pt-3 border-t border-white/5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Columns className="w-3.5 h-3.5 text-purple-400" />
              Proporción Vertical
            </label>
            <span className="text-xs font-mono text-purple-400">{val}% / {100 - val}%</span>
          </div>
          <input
            type="range" min={10} max={90} value={val}
            onChange={e => updateConfig('zone_a_width', Number(e.target.value))}
            className="w-full accent-[#00F0FF] h-2 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>Zona A (Izq.)</span>
            <span>Zona B (Der.)</span>
          </div>
        </div>
      );
    }

    if (layout === 'l-shape') {
      const topH = layout_config.top_row_height ?? 85;
      const aW = layout_config.zone_a_width ?? 70;
      return (
        <div className="space-y-4 pt-3 border-t border-white/5">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-300">Altura — Fila Superior</label>
              <span className="text-xs font-mono text-[#00F0FF]">{topH}% / {100 - topH}%</span>
            </div>
            <input
              type="range" min={50} max={95} value={topH}
              onChange={e => updateConfig('top_row_height', Number(e.target.value))}
              className="w-full accent-[#00F0FF] h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>Zonas A+B</span>
              <span>Cintillo C</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-300">Ancho — Zona Principal</label>
              <span className="text-xs font-mono text-amber-400">{aW}% / {100 - aW}%</span>
            </div>
            <input
              type="range" min={40} max={90} value={aW}
              onChange={e => updateConfig('zone_a_width', Number(e.target.value))}
              className="w-full accent-[#00F0FF] h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>Zona A (Principal)</span>
              <span>Zona B (Lateral)</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Zonas disponibles según el layout activo
  const availableZones = () => {
    switch (deviceConfig.layout) {
      case 'split-h':
      case 'split-v': return ['A', 'B'];
      case 'l-shape': return ['A', 'B', 'C'];
      default: return ['A'];
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Dispositivos
            {isLoading && <Loader2 className="w-5 h-5 text-[#00F0FF] animate-spin" />}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gestiona tus reproductores, configura su resolución y divide las pantallas en múltiples listas de reproducción (Multi-Zona).</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#00F0FF] hover:bg-[#00D1FF] text-[#0B0F19] px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] shrink-0"
        >
          <Plus className="w-5 h-5" />
          Vincular Pantalla
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-[#161C2D] p-4 rounded-2xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o serie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'online', 'offline'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filterStatus === status
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-transparent text-gray-400 border border-white/5 hover:bg-white/5'
              }`}
            >
              {status === 'all' ? 'Todos' : status === 'online' ? 'Online' : 'Offline'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDevices.map(device => {
          const config = {
            layout: (device.layout || 'single') as DeviceConfig['layout'],
            resolution: device.resolution || '1920x1080',
            layout_config: (device as any).layout_config || {},
          };
          return (
            <div
              key={device.id}
              onClick={() => setSelectedDevice(device)}
              className="bg-[#161C2D] border border-white/5 rounded-2xl p-6 hover:border-[#00F0FF]/30 cursor-pointer transition-all group relative overflow-hidden shadow-lg shadow-black/20"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0B0F19] border border-white/10 flex items-center justify-center shrink-0">
                    <MonitorPlay className="w-5 h-5 text-gray-400 group-hover:text-[#00F0FF] transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight group-hover:text-[#00F0FF] transition-colors">{device.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-1">{device.serialNumber}</p>
                  </div>
                </div>
                {getStatusBadge(device.status)}
              </div>

              <div className="space-y-4">
                <div className="flex gap-3 items-center bg-[#0B0F19]/50 border border-white/5 rounded-xl p-2.5">
                  <div className="w-20 shrink-0">
                    {renderLayoutBlueprint(config.layout, config.layout_config, true)}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="text-gray-400 font-medium">Diseño: <span className="text-white">{getLayoutName(config.layout)}</span></p>
                    <p className="text-gray-500 mt-1 font-mono">Resolución: {config.resolution}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-400">Almacenamiento Local</span>
                    <span className="text-white font-medium">{device.storageUsed} GB / {device.storageTotal} GB</span>
                  </div>
                  <div className="w-full bg-[#0B0F19] rounded-full h-2 border border-white/5 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${(device.storageUsed / device.storageTotal) > 0.8 ? 'bg-red-500' : 'bg-[#00F0FF]'}`}
                      style={{ width: `${(device.storageUsed / device.storageTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                    <RefreshCw className="w-3 h-3" /> Latido: {device.lastHeartbeat}
                  </span>
                  <button
                    className="text-xs font-semibold text-[#00F0FF] hover:text-[#00D1FF] bg-[#00F0FF]/5 hover:bg-[#00F0FF]/15 border border-[#00F0FF]/15 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    onClick={(e) => { e.stopPropagation(); setSelectedDevice(device); }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Ajustes
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDevices.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#161C2D] border border-white/5 rounded-2xl p-12 text-center">
          <MonitorPlay className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No se encontraron dispositivos</h3>
          <p className="text-gray-400">Intenta cambiar los filtros de búsqueda o vincular una nueva pantalla.</p>
        </div>
      )}

      {/* ── DRAWER LATERAL DE AJUSTES ── */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
            onClick={() => setSelectedDevice(null)}
          ></div>

          <div className="relative w-full max-w-lg bg-[#161C2D] border-l border-white/10 h-full shadow-2xl flex flex-col z-10 animate-slide-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#161C2D]/80 backdrop-blur-md shrink-0">
              <div>
                <span className="text-xs font-bold text-[#00F0FF] uppercase tracking-widest flex items-center gap-1.5 mb-1">
                  <Settings className="w-3 h-3" /> Ajustes del Player
                </span>
                <h3 className="text-xl font-bold text-white">{selectedDevice.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Serie: {selectedDevice.serialNumber}</p>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 shrink-0">
              <button
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'config'
                    ? 'text-[#00F0FF] border-b-2 border-[#00F0FF] bg-[#00F0FF]/5'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" /> Configuración
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'schedule'
                    ? 'text-[#00F0FF] border-b-2 border-[#00F0FF] bg-[#00F0FF]/5'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Programación
              </button>
            </div>

            {/* ── TAB CONFIGURACIÓN ── */}
            {activeTab === 'config' && (
              <form onSubmit={handleSaveDeviceConfig} className="flex-1 overflow-y-auto p-6 space-y-6">
                {configSuccess && (
                  <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-semibold">¡Ajustes guardados y sincronizados con la Pi con éxito!</p>
                  </div>
                )}

                {/* Resolución */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white flex items-center gap-1.5">
                    <Maximize className="w-4 h-4 text-gray-400" /> Resolución de Pantalla
                  </label>
                  <p className="text-xs text-gray-500">Ajusta la salida del puerto HDMI de la Raspberry Pi para adaptarla al televisor.</p>
                  <select
                    value={deviceConfig.resolution}
                    onChange={(e) => setDeviceConfig({ ...deviceConfig, resolution: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
                  >
                    <optgroup label="Paisaje Horizontal (16:9)">
                      <option value="1920x1080">1920 x 1080 (Full HD 1080p)</option>
                      <option value="1280x720">1280 x 720 (HD Ready 720p)</option>
                      <option value="3840x2160">3840 x 2160 (4K Ultra HD)</option>
                    </optgroup>
                    <optgroup label="Retrato Vertical (9:16 - Totems / Kioscos)">
                      <option value="1080x1920">1080 x 1920 (Vertical Full HD)</option>
                      <option value="720x1280">720 x 1280 (Vertical HD)</option>
                      <option value="2160x3840">2160 x 3840 (Vertical 4K UHD)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Layouts Multi-Zona */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-white flex items-center gap-1.5">
                    <Layout className="w-4 h-4 text-gray-400" /> Distribución de Pantalla (Layout Multi-Zona)
                  </label>
                  <p className="text-xs text-gray-500">Divide tu monitor en diferentes secciones independientes para reproducir varias listas a la vez.</p>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'single', label: 'Pantalla Completa', icon: Maximize },
                      { id: 'split-h', label: 'División Horiz.', icon: Columns },
                      { id: 'split-v', label: 'División Vert.', icon: Columns },
                      { id: 'l-shape', label: 'Diseño Comercial L', icon: Layout },
                    ].map(opt => {
                      const IconComp = opt.icon;
                      const isSelected = deviceConfig.layout === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleLayoutChange(opt.id as DeviceConfig['layout'])}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                            isSelected
                              ? 'bg-[#00F0FF]/5 border-[#00F0FF] text-white shadow-[0_0_15px_rgba(0,240,255,0.05)]'
                              : 'bg-[#0B0F19] border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <IconComp className={`w-5 h-5 ${isSelected ? 'text-[#00F0FF]' : 'text-gray-500'} ${opt.id === 'split-h' ? 'rotate-90' : ''}`} />
                          <span className="text-xs font-bold leading-tight">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Canvas + Sliders + Playlists */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Canvas de Previsualización en Tiempo Real</span>

                  {/* Blueprint reactivo al slider */}
                  {renderLayoutBlueprint(deviceConfig.layout, deviceConfig.layout_config)}

                  {/* Sliders de proporción */}
                  {renderLayoutSliders()}

                  {/* Asignación de Playlists por Zona */}
                  <div className="space-y-4 pt-2">
                    {/* Zona A */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center text-[10px] font-mono">A</span>
                        {deviceConfig.layout === 'single' ? 'Playlist Principal' : 'Playlist Zona A (Superior/Izq.)'}
                      </label>
                      <select
                        value={deviceConfig.zonePlaylists.zoneA}
                        onChange={(e) => setDeviceConfig({ ...deviceConfig, zonePlaylists: { ...deviceConfig.zonePlaylists, zoneA: e.target.value } })}
                        className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                      >
                        <option value="">-- Sin Playlist Seleccionada --</option>
                        {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    {/* Zona B */}
                    {deviceConfig.layout !== 'single' && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center text-[10px] font-mono">B</span>
                          {deviceConfig.layout === 'l-shape' ? 'Playlist Barra Lateral' : 'Playlist Zona B (Inferior/Der.)'}
                        </label>
                        <select
                          value={deviceConfig.zonePlaylists.zoneB}
                          onChange={(e) => setDeviceConfig({ ...deviceConfig, zonePlaylists: { ...deviceConfig.zonePlaylists, zoneB: e.target.value } })}
                          className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                        >
                          <option value="">-- Sin Playlist Seleccionada --</option>
                          {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Zona C */}
                    {deviceConfig.layout === 'l-shape' && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center text-[10px] font-mono">C</span>
                          Playlist Cintillo Inferior
                        </label>
                        <select
                          value={deviceConfig.zonePlaylists.zoneC}
                          onChange={(e) => setDeviceConfig({ ...deviceConfig, zonePlaylists: { ...deviceConfig.zonePlaylists, zoneC: e.target.value } })}
                          className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                        >
                          <option value="">-- Sin Playlist Seleccionada --</option>
                          {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Zona de Peligro */}
                <div className="pt-6 border-t border-red-500/20 space-y-3">
                  <span className="block text-xs font-bold text-red-400 uppercase tracking-wider">Zona de Peligro</span>
                  <p className="text-xs text-gray-500">Al desvincular el reproductor, se borrará su asociación, se limpiará su caché de medios local y se reiniciará a su estado de fábrica mostrando un nuevo código de vinculación.</p>
                  <button
                    type="button"
                    disabled={isUnpairing}
                    onClick={handleUnpairDevice}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 mb-4"
                  >
                    {isUnpairing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Desvincular Pantalla (Restablecer)
                  </button>
                </div>

                {/* Botones Guardado */}
                <div className="pt-6 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="flex-1 bg-[#00F0FF] hover:bg-[#00D1FF] text-[#0B0F19] font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
                  >
                    {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Guardar Configuración
                  </button>
                </div>
              </form>
            )}

            {/* ── TAB PROGRAMACIÓN ── */}
            {activeTab === 'schedule' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Formulario nueva regla */}
                <div className="bg-[#0B0F19] border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlarmClock className="w-4 h-4 text-[#00F0FF]" />
                    <span className="text-sm font-bold text-white">Nueva Regla de Programación</span>
                  </div>

                  <form onSubmit={handleCreateSchedule} className="space-y-4">
                    {/* Zona y Playlist */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400">Zona</label>
                        <select
                          value={newSchedule.zone}
                          onChange={e => setNewSchedule({ ...newSchedule, zone: e.target.value })}
                          className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                        >
                          {availableZones().map(z => <option key={z} value={z}>Zona {z}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400">Playlist</label>
                        <select
                          required
                          value={newSchedule.playlist_id}
                          onChange={e => setNewSchedule({ ...newSchedule, playlist_id: e.target.value })}
                          className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                        >
                          <option value="">Seleccionar...</option>
                          {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Horario */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Hora inicio
                        </label>
                        <input
                          type="time"
                          value={newSchedule.start_time}
                          onChange={e => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                          className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Hora fin
                        </label>
                        <input
                          type="time"
                          value={newSchedule.end_time}
                          onChange={e => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                          className="w-full bg-[#161C2D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                        />
                      </div>
                    </div>

                    {/* Días de la semana */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400">Días de la Semana</label>
                      <div className="flex gap-2">
                        {DAYS_LABELS.map(({ value, label }) => {
                          const isActive = newSchedule.days_of_week.includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => toggleDay(value)}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                isActive
                                  ? 'bg-[#00F0FF] text-[#0B0F19] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                                  : 'bg-[#161C2D] border border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingSchedule || !newSchedule.playlist_id || newSchedule.days_of_week.length === 0}
                      className="w-full bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isCreatingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Agregar Regla
                    </button>
                  </form>
                </div>

                {/* Lista de reglas existentes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Programaciones Activas
                    </span>
                    {isLoadingSchedules && <Loader2 className="w-3.5 h-3.5 text-[#00F0FF] animate-spin" />}
                  </div>

                  {!isLoadingSchedules && schedules.length === 0 && (
                    <div className="text-center py-10 bg-[#0B0F19]/50 rounded-2xl border border-white/5">
                      <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-400 font-medium">Sin programaciones</p>
                      <p className="text-xs text-gray-600 mt-1">Crea tu primera regla horaria arriba.</p>
                    </div>
                  )}

                  {schedules.map(schedule => {
                    const dayLabels = DAYS_LABELS
                      .filter(d => schedule.days_of_week.includes(d.value))
                      .map(d => d.label)
                      .join(' ');
                    const isDeleting = deletingScheduleId === schedule.id;

                    return (
                      <div
                        key={schedule.id}
                        className="bg-[#0B0F19] border border-white/8 rounded-xl p-4 flex items-start justify-between gap-3 group hover:border-white/15 transition-colors"
                      >
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center text-[10px] font-bold shrink-0">
                              {schedule.zone}
                            </span>
                            <span className="text-xs font-bold text-white truncate">
                              {getPlaylistName(schedule.playlist_id)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {schedule.start_time.slice(0, 5)} – {schedule.end_time.slice(0, 5)}
                            </span>
                            <span className="font-mono tracking-wider">{dayLabels}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          disabled={isDeleting}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors shrink-0"
                        >
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL VINCULAR ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-[#161C2D] border border-white/10 rounded-2xl w-full max-w-md relative z-10 shadow-2xl shadow-black/50 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">Vincular Nueva Pantalla</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleLinkDevice} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Código de Activación (6 dígitos)</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all placeholder:tracking-normal placeholder:text-gray-600"
                  placeholder="XXXXXX"
                />
                <p className="text-xs text-gray-500 mt-2">Ingresa el código que aparece en la pantalla al encender el Player por primera vez.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre Asignado</label>
                <input
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
                  placeholder="Ej. Pantalla Entrada Principal"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={activationCode.length !== 6 || !deviceName.trim()}
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
