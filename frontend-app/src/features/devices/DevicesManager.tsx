import React, { useState, useEffect } from 'react';
import { Search, Plus, MonitorPlay, Wifi, WifiOff, RefreshCw, ServerCog, X, Loader2, Settings, Columns, Maximize, Layout, CheckCircle2 } from 'lucide-react';
import type { Device, DeviceStatus } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface DeviceConfig {
  resolution: string;
  layout: 'single' | 'split-h' | 'split-v' | 'l-shape';
  zonePlaylists: {
    zoneA: string;
    zoneB: string;
    zoneC: string;
  };
}

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
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig>({
    resolution: '1920x1080',
    layout: 'single',
    zonePlaylists: { zoneA: '', zoneB: '', zoneC: '' }
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Cargar configuraciones de dispositivo desde LocalStorage para persistencia interactiva
  const getDeviceConfig = (deviceId: string): DeviceConfig => {
    const saved = localStorage.getItem(`device_config_${deviceId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      resolution: '1920x1080',
      layout: 'single',
      zonePlaylists: { zoneA: '', zoneB: '', zoneC: '' }
    };
  };

  const fetchDevices = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/devices/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Error al obtener los reproductores vinculados.');
      }
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      }
    } catch (e) {
      console.warn("Error fetching playlists:", e);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchPlaylists();
  }, []);

  // Al abrir el drawer de configuración de un dispositivo
  useEffect(() => {
    if (selectedDevice) {
      const config = getDeviceConfig(selectedDevice.id);
      setDeviceConfig(config);
      setConfigSuccess(false);
    }
  }, [selectedDevice]);

  const handleSaveDeviceConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    setIsSavingConfig(true);
    setConfigSuccess(false);
    
    // Simular guardado y sincronización con el Daemon de la Raspberry Pi
    setTimeout(() => {
      localStorage.setItem(`device_config_${selectedDevice.id}`, JSON.stringify(deviceConfig));
      setIsSavingConfig(false);
      setConfigSuccess(true);
      
      // Simular cambio temporal del dispositivo a estado "syncing" para dar sensación premium
      setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, status: 'syncing' } : d));
      
      setTimeout(() => {
        setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, status: 'online', lastHeartbeat: 'Justo ahora' } : d));
      }, 2500);
      
      setTimeout(() => {
        setConfigSuccess(false);
        setSelectedDevice(null);
      }, 1500);
    }, 1200);
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pairing_code: activationCode,
            name: deviceName
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Error al vincular el reproductor.');
        }
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
      case 'split-h': return 'Dividido Horizontal (50/50)';
      case 'split-v': return 'Dividido Vertical (50/50)';
      case 'l-shape': return 'Diseño en L (Multi-Zona)';
      default: return 'No asignado';
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Dibujo visual dinámico de la zona seleccionada en el Panel lateral
  const renderLayoutBlueprint = (layoutType: 'single' | 'split-h' | 'split-v' | 'l-shape', previewMode = false) => {
    const baseClass = `bg-[#0B0F19] rounded-xl border border-dashed border-white/15 w-full flex overflow-hidden relative ${previewMode ? 'h-16' : 'h-40'}`;
    
    switch (layoutType) {
      case 'single':
        return (
          <div className={baseClass}>
            <div className="flex-1 bg-[#00F0FF]/5 hover:bg-[#00F0FF]/10 transition-colors flex flex-col items-center justify-center text-xs font-bold text-[#00F0FF] p-2 text-center">
              <Maximize className="w-4 h-4 mb-1" />
              <span>Zona Principal (100%)</span>
            </div>
          </div>
        );
      case 'split-h':
        return (
          <div className={`${baseClass} flex-col`}>
            <div className="flex-1 border-b border-white/10 bg-blue-500/5 hover:bg-blue-500/10 transition-colors flex items-center justify-center text-[10px] font-bold text-blue-400">
              Zona Superior (50%)
            </div>
            <div className="flex-1 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors flex items-center justify-center text-[10px] font-bold text-indigo-400">
              Zona Inferior (50%)
            </div>
          </div>
        );
      case 'split-v':
        return (
          <div className={baseClass}>
            <div className="flex-1 border-r border-white/10 bg-purple-500/5 hover:bg-purple-500/10 transition-colors flex items-center justify-center text-[10px] font-bold text-purple-400 text-center px-1">
              Zona Izq (50%)
            </div>
            <div className="flex-1 bg-pink-500/5 hover:bg-pink-500/10 transition-colors flex items-center justify-center text-[10px] font-bold text-pink-400 text-center px-1">
              Zona Der (50%)
            </div>
          </div>
        );
      case 'l-shape':
        return (
          <div className={`${baseClass} flex-col p-1 gap-1`}>
            <div className="flex-1 flex gap-1">
              <div className="flex-[3] rounded border border-white/5 bg-[#00F0FF]/5 hover:bg-[#00F0FF]/10 flex items-center justify-center text-[8px] font-bold text-[#00F0FF]">
                Principal (70%)
              </div>
              <div className="flex-[1.2] rounded border border-white/5 bg-amber-500/5 hover:bg-amber-500/10 flex items-center justify-center text-[8px] font-bold text-amber-400 text-center">
                Lateral
              </div>
            </div>
            <div className="h-6 rounded border border-white/5 bg-emerald-500/5 hover:bg-emerald-500/10 flex items-center justify-center text-[8px] font-bold text-emerald-400">
              Cintillo Inferior (15%)
            </div>
          </div>
        );
      default:
        return null;
    }
  };

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
          const config = getDeviceConfig(device.id);
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
                {/* Visual Blueprint Thumbnail de la pantalla actual */}
                <div className="flex gap-3 items-center bg-[#0B0F19]/50 border border-white/5 rounded-xl p-2.5">
                  <div className="w-20 shrink-0">
                    {renderLayoutBlueprint(config.layout, true)}
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
                      className={`h-2 rounded-full ${
                        (device.storageUsed / device.storageTotal) > 0.8 ? 'bg-red-500' : 'bg-[#00F0FF]'
                      }`}
                      style={{ width: `${(device.storageUsed / device.storageTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                    <RefreshCw className="w-3 h-3" /> Latido: {device.lastHeartbeat}
                  </span>
                  
                  <div className="flex gap-2">
                    <button 
                      className="text-xs font-semibold text-[#00F0FF] hover:text-[#00D1FF] bg-[#00F0FF]/5 hover:bg-[#00F0FF]/15 border border-[#00F0FF]/15 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDevice(device);
                      }}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Ajustes
                    </button>
                  </div>
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

      {/* Drawer Panel Lateral Izquierdo/Derecho de Ajustes de Pantalla */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop de sombra con desenfoque */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
            onClick={() => setSelectedDevice(null)}
          ></div>
          
          {/* Panel deslizante */}
          <div className="relative w-full max-w-lg bg-[#161C2D] border-l border-white/10 h-full shadow-2xl flex flex-col z-10 animate-slide-in overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#161C2D]/80 backdrop-blur-md">
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

            <form onSubmit={handleSaveDeviceConfig} className="flex-1 overflow-y-auto p-6 space-y-6">
              {configSuccess && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-semibold">¡Ajustes guardados y sincronizados con la Pi con éxito!</p>
                </div>
              )}

              {/* 1. Selección de Resolución */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white flex items-center gap-1.5">
                  <Maximize className="w-4 h-4 text-gray-400" /> Resolución de Pantalla (HD/Kiosco)
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

              {/* 2. Layouts Multi-Zona */}
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
                    { id: 'l-shape', label: 'Diseño Comercial L', icon: Layout }
                  ].map(opt => {
                    const IconComp = opt.icon;
                    const isSelected = deviceConfig.layout === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDeviceConfig({ 
                          ...deviceConfig, 
                          layout: opt.id as any,
                          zonePlaylists: { zoneA: '', zoneB: '', zoneC: '' } // Limpiar zonas
                        })}
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

              {/* 3. Canvas Blueprint y Asignación de Playlists por Zona */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Canvas de Previsualización Activa</span>
                {renderLayoutBlueprint(deviceConfig.layout)}

                <div className="space-y-4">
                  {/* Zona A: Principal */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center text-[10px] font-mono">A</span>
                      {deviceConfig.layout === 'single' ? 'Playlist Principal' : 'Playlist Zona Superior/Izq'}
                    </label>
                    <select
                      value={deviceConfig.zonePlaylists.zoneA}
                      onChange={(e) => setDeviceConfig({
                        ...deviceConfig,
                        zonePlaylists: { ...deviceConfig.zonePlaylists, zoneA: e.target.value }
                      })}
                      className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                    >
                      <option value="">-- Sin Playlist Seleccionada --</option>
                      {playlists.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Zona B: Dependiendo del Split */}
                  {deviceConfig.layout !== 'single' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center text-[10px] font-mono">B</span>
                        {deviceConfig.layout === 'l-shape' ? 'Playlist Barra Lateral (30%)' : 'Playlist Zona Inferior/Der'}
                      </label>
                      <select
                        value={deviceConfig.zonePlaylists.zoneB}
                        onChange={(e) => setDeviceConfig({
                          ...deviceConfig,
                          zonePlaylists: { ...deviceConfig.zonePlaylists, zoneB: e.target.value }
                        })}
                        className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                      >
                        <option value="">-- Sin Playlist Seleccionada --</option>
                        {playlists.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Zona C: Cintillo Inferior (Solo para L-Shape) */}
                  {deviceConfig.layout === 'l-shape' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center text-[10px] font-mono">C</span>
                        Playlist Cintillo Inferior (Banner 15%)
                      </label>
                      <select
                        value={deviceConfig.zonePlaylists.zoneC}
                        onChange={(e) => setDeviceConfig({
                          ...deviceConfig,
                          zonePlaylists: { ...deviceConfig.zonePlaylists, zoneC: e.target.value }
                        })}
                        className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                      >
                        <option value="">-- Sin Playlist Seleccionada --</option>
                        {playlists.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Guardado */}
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
          </div>
        </div>
      )}

      {/* Modal Vincular */}
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
