import { useState } from 'react';
import { Search, Plus, MonitorPlay, Wifi, WifiOff, RefreshCw, ServerCog, X } from 'lucide-react';
import type { Device, DeviceStatus } from '../../types';

const INITIAL_DEVICES: Device[] = [
  {
    id: '1',
    serialNumber: 'AD-8291-MX',
    name: 'Pantalla Recepción',
    status: 'online',
    lastHeartbeat: 'Hace 1 min',
    storageUsed: 12.5,
    storageTotal: 120,
  },
  {
    id: '2',
    serialNumber: 'AD-4412-MX',
    name: 'Vitrina Principal',
    status: 'offline',
    lastHeartbeat: 'Hace 2 horas',
    storageUsed: 85.2,
    storageTotal: 120,
  },
  {
    id: '3',
    serialNumber: 'AD-9923-MX',
    name: 'Pasillo Ofertas',
    status: 'syncing',
    lastHeartbeat: 'Hace 5 seg',
    storageUsed: 45.0,
    storageTotal: 500,
  }
];

export default function DevicesManager() {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | DeviceStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [activationCode, setActivationCode] = useState('');
  const [deviceName, setDeviceName] = useState('');

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleLinkDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (activationCode.length === 6 && deviceName.trim()) {
      const newDevice: Device = {
        id: Math.random().toString(36).substr(2, 9),
        serialNumber: `AD-${Math.floor(1000 + Math.random() * 9000)}-NW`,
        name: deviceName,
        status: 'syncing',
        lastHeartbeat: 'Justo ahora',
        storageUsed: 0.1,
        storageTotal: 120,
      };
      setDevices([...devices, newDevice]);
      setIsModalOpen(false);
      setActivationCode('');
      setDeviceName('');
    }
  };

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case 'online':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20"><Wifi className="w-3 h-3" /> Online</span>;
      case 'offline':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><WifiOff className="w-3 h-3" /> Offline</span>;
      case 'syncing':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><RefreshCw className="w-3 h-3 animate-spin" /> Syncing</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20"><ServerCog className="w-3 h-3" /> Maint</span>;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dispositivos</h1>
          <p className="text-gray-400 text-sm mt-1">Gestiona tus reproductores y monitorea su estado de almacenamiento y conexión.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#00F0FF] hover:bg-[#00D1FF] text-[#0B0F19] px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
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
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDevices.map(device => (
          <div key={device.id} className="bg-[#161C2D] border border-white/5 rounded-2xl p-6 hover:border-[#00F0FF]/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0B0F19] border border-white/10 flex items-center justify-center">
                  <MonitorPlay className="w-5 h-5 text-gray-400 group-hover:text-[#00F0FF] transition-colors" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{device.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">{device.serialNumber}</p>
                </div>
              </div>
              {getStatusBadge(device.status)}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-400">Almacenamiento Local</span>
                  <span className="text-white font-medium">{device.storageUsed} GB / {device.storageTotal} GB</span>
                </div>
                <div className="w-full bg-[#0B0F19] rounded-full h-2 border border-white/5 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full ${
                      (device.storageUsed / device.storageTotal) > 0.8 ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(device.storageUsed / device.storageTotal) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Último latido: {device.lastHeartbeat}
                </span>
                <button 
                  className="text-xs font-semibold text-[#00F0FF] hover:text-[#00D1FF] bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 px-3 py-1.5 rounded-lg transition-colors"
                  onClick={() => {
                    setDevices(devices.map(d => d.id === device.id ? { ...d, status: 'syncing' } : d));
                    setTimeout(() => {
                      setDevices(devices.map(d => d.id === device.id ? { ...d, status: 'online', lastHeartbeat: 'Justo ahora' } : d));
                    }, 2000);
                  }}
                >
                  Forzar Refresco
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#161C2D] border border-white/5 rounded-2xl p-12 text-center">
          <MonitorPlay className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No se encontraron dispositivos</h3>
          <p className="text-gray-400">Intenta cambiar los filtros de búsqueda.</p>
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
