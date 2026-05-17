import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Menu, X, Bell, User, ShieldAlert } from 'lucide-react';

export default function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState('Owner Admin');
  const [adminEmail, setAdminEmail] = useState('admin@ad-mesh.com');

  useEffect(() => {
    // Decodificar el token para validar que de verdad es admin
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    try {
      // Decode JWT token payload (simple base64 decode for frontend display safety)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      if (payload) {
        setIsAdmin(true); 
        if (payload.full_name) setAdminName(payload.full_name);
        if (payload.email) setAdminEmail(payload.email);
      }
    } catch (e) {
      console.error("Failed to decode token:", e);
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Consola Global', path: '/admin', icon: LayoutDashboard },
    { name: 'Gestión de Clientes', path: '/admin/users', icon: Users },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto animate-bounce" />
          <h2 className="text-2xl font-bold text-white">Acceso Denegado</h2>
          <p className="text-gray-400 text-sm">No tienes permisos para ver esta consola de administración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#07090e] overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0d121f] border-r border-white/5">
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center shadow-[0_0_15px_rgba(112,0,255,0.4)]">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">ad-mesh <span className="text-xs bg-[#7000FF] text-white px-2 py-0.5 rounded-full font-normal">Admin</span></span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive
                    ? 'bg-[#7000FF]/15 text-[#b280ff] border border-[#7000FF]/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <button
            onClick={() => navigate('/devices')}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-xs font-semibold transition-all border border-white/5"
          >
            Vista Cliente
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 font-medium"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0d121f] border-r border-white/5">
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight">ad-mesh <span className="text-xs bg-[#7000FF] text-white px-2 py-0.5 rounded-full font-normal">Admin</span></span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                      isActive
                        ? 'bg-[#7000FF]/15 text-[#b280ff] border border-[#7000FF]/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-white/5 space-y-2">
              <button
                onClick={() => navigate('/devices')}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-xs font-semibold transition-all border border-white/5"
              >
                Vista Cliente
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 font-medium"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-6 bg-[#0d121f]/50 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white tracking-wide">Consola de Control SaaS</h2>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#7000FF] rounded-full ring-2 ring-[#0d121f]"></span>
            </button>
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white">{adminName}</p>
                <p className="text-xs text-gray-400 font-mono">{adminEmail}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7000FF] to-[#00F0FF] p-[1.5px]">
                <div className="w-full h-full rounded-full bg-[#0d121f] flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
