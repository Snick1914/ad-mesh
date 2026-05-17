import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MonitorPlay, Film, ListMusic, Bell, User, LogOut, Menu, X, Cpu } from 'lucide-react';

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Decodificar el token para ver si es superuser y mostrar link de admin
  const token = localStorage.getItem('token');
  let isSuperuser = false;
  let userName = 'Usuario ad-mesh';
  let userEmail = '';
  try {
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      if (payload) {
        if (payload.is_superuser) {
          isSuperuser = true;
        }
        if (payload.full_name) {
          userName = payload.full_name;
        } else if (payload.email) {
          userName = payload.email.split('@')[0];
        }
        if (payload.email) {
          userEmail = payload.email;
        }
      }
    }
  } catch (e) {
    console.error("Error reading token inside DashboardLayout:", e);
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dispositivos', path: '/devices', icon: MonitorPlay },
    { name: 'Telemetría IoT', path: '/telemetry', icon: Cpu },
    { name: 'Biblioteca', path: '/media', icon: Film },
    { name: 'Playlists', path: '/playlists', icon: ListMusic },
  ];

  return (
    <div className="flex h-screen bg-[#0a0d14] overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#161C2D] border-r border-white/5">
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00F0FF] to-blue-600 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-[#0B0F19]" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">ad-mesh</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive
                    ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20'
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
          {isSuperuser && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#7000FF] hover:bg-[#8626ff] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(112,0,255,0.4)]"
            >
              Consola Admin
            </button>
          )}
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
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-[#161C2D] border-r border-white/5">
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00F0FF] to-blue-600 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-[#0B0F19]" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight">ad-mesh</span>
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
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                      isActive
                        ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20'
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
              {isSuperuser && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/admin');
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#7000FF] hover:bg-[#8626ff] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(112,0,255,0.4)]"
                >
                  Consola Admin
                </button>
              )}
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
        <header className="h-20 flex items-center justify-between px-6 bg-[#161C2D]/50 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-white hidden sm:block">Panel de Control</h2>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#00F0FF] rounded-full ring-2 ring-[#161C2D]"></span>
            </button>
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-gray-400">{userEmail}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <User className="w-5 h-5 text-gray-300" />
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
