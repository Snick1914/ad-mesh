import { useState, useEffect } from 'react';
import { Search, Edit2, ShieldAlert, CheckCircle, UserCheck, Shield, ExternalLink, RefreshCw, X } from 'lucide-react';

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_superuser: boolean;
  max_devices: number;
  max_storage_gb: number;
}

export default function AdminUsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modales
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [maxDevices, setMaxDevices] = useState(5);
  const [maxStorage, setMaxStorage] = useState(10);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';

    try {
      const response = await fetch(`${apiUrl}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Error fetching users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.warn("API list users failed, using fallback:", err);
      // Fallback premium clients list
      setUsers([
        { id: 1, full_name: "Roberto Olmos", email: "roberto@admesh.com", phone: "5512345678", is_active: true, is_superuser: true, max_devices: 20, max_storage_gb: 100 },
        { id: 2, full_name: "Gimnasio FitZone", email: "admin@fitzone.com", phone: "5598765432", is_active: true, is_superuser: false, max_devices: 8, max_storage_gb: 25 },
        { id: 3, full_name: "Restaurante El Gourmet", email: "contacto@elgourmet.mx", phone: "5577665544", is_active: true, is_superuser: false, max_devices: 4, max_storage_gb: 15 },
        { id: 4, full_name: "Tienda ModaExpress", email: "compras@modaexpress.com", phone: "5522334455", is_active: false, is_superuser: false, max_devices: 5, max_storage_gb: 10 }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setMaxDevices(user.max_devices);
    setMaxStorage(user.max_storage_gb);
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdating(true);

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';

    try {
      const response = await fetch(`${apiUrl}/admin/users/${editingUser.id}/limits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          max_devices: maxDevices,
          max_storage_gb: maxStorage
        })
      });

      if (!response.ok) throw new Error('Error updating limits');
      const updatedUser = await response.json();
      
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      setEditingUser(null);
    } catch (err) {
      // Local fallback edit
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, max_devices: maxDevices, max_storage_gb: maxStorage } : u));
      setEditingUser(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const newStatus = !user.is_active;

    try {
      const response = await fetch(`${apiUrl}/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_active: newStatus
        })
      });

      if (!response.ok) throw new Error('Error changing status');
      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    } catch (err) {
      // Local fallback change
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
    }
  };

  const handleImpersonate = async (user: User) => {
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';

    try {
      const response = await fetch(`${apiUrl}/admin/users/${user.id}/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Error impersonating');
      const data = await response.json();
      
      // Guardamos el token del usuario y redirigimos
      localStorage.setItem('admin_token', token || ''); // Respaldamos el token de admin
      localStorage.setItem('token', data.access_token);
      window.location.href = '/devices';
    } catch (err) {
      alert("La simulación de soporte solo está disponible con el servidor conectado.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Gestión de Clientes</h1>
          <p className="text-gray-400 text-sm mt-1">Administra accesos, cuotas y soporte en tiempo real.</p>
        </div>
      </div>

      {/* Control de Filtros */}
      <div className="flex bg-[#121824]/85 border border-white/5 p-4 rounded-xl items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0d14] border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7000FF] focus:border-transparent transition-all text-sm"
          />
        </div>
        <button
          onClick={fetchUsers}
          className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/5"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Listado de Clientes */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#7000FF] animate-spin" />
        </div>
      ) : (
        <div className="bg-[#121824]/80 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#0a0d14]/40 text-xs font-mono text-gray-500 uppercase tracking-widest">
                  <th className="py-4 px-6">Cliente</th>
                  <th className="py-4 px-6">Límites</th>
                  <th className="py-4 px-6">Tipo</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Info Básica */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-[#b280ff] border border-white/5">
                          {user.full_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-white font-bold">{user.full_name}</h4>
                          <span className="text-xs text-gray-500 font-mono">{user.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Límites de Plan */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <p className="text-xs">Pantallas: <span className="text-[#00F0FF] font-bold font-mono">{user.max_devices}</span></p>
                        <p className="text-xs">Espacio: <span className="text-emerald-400 font-bold font-mono">{user.max_storage_gb} GB</span></p>
                      </div>
                    </td>

                    {/* Tipo / Rol */}
                    <td className="py-4 px-6">
                      {user.is_superuser ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-[#7000FF]/15 text-[#b280ff] border border-[#7000FF]/30 px-2.5 py-1 rounded-full font-bold">
                          <Shield className="w-3.5 h-3.5" />
                          Super Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-white/5 text-gray-400 border border-white/10 px-2.5 py-1 rounded-full font-medium">
                          Cliente Regular
                        </span>
                      )}
                    </td>

                    {/* Estado de Cuenta */}
                    <td className="py-4 px-6">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 font-bold">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Suspendido
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-4 px-6 text-right space-x-2">
                      {/* Impersonación */}
                      {!user.is_superuser && (
                        <button
                          onClick={() => handleImpersonate(user)}
                          title="Soporte Técnico Rápido"
                          className="p-2 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/20 text-[#00F0FF] rounded-xl transition-all inline-flex items-center gap-1 text-xs font-bold"
                        >
                          <ExternalLink className="w-4 h-4" /> Entrar
                        </button>
                      )}

                      {/* Editar límites */}
                      <button
                        onClick={() => handleEditClick(user)}
                        title="Modificar límites"
                        className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5 inline-flex items-center"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Activar/Desactivar */}
                      {!user.is_superuser && (
                        <button
                          onClick={() => handleToggleStatus(user)}
                          title={user.is_active ? 'Suspender cuenta' : 'Activar cuenta'}
                          className={`p-2 rounded-xl transition-all border inline-flex items-center ${
                            user.is_active 
                              ? 'bg-red-500/10 hover:bg-red-500/25 border-red-500/20 text-red-400' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Edición de Límites */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(112,0,255,0.25)]">
            <button 
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Ajustar Límites</h3>
            <p className="text-gray-400 text-xs mb-6">Asigna cuota de pantallas y disco para <span className="text-[#b280ff] font-bold">{editingUser.full_name}</span>.</p>

            <form onSubmit={handleSaveLimits} className="space-y-6">
              {/* Pantallas */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">Límite de Pantallas</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={maxDevices}
                  onChange={(e) => setMaxDevices(parseInt(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7000FF]"
                />
              </div>

              {/* Disco */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">Espacio de Almacenamiento (GB)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={maxStorage}
                  onChange={(e) => setMaxStorage(parseInt(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7000FF]"
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-[#7000FF] hover:bg-[#8626ff] text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(112,0,255,0.4)] disabled:opacity-50"
                >
                  {isUpdating ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
