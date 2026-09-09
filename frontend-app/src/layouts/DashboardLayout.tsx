import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { MonitorPlay, Film, ListMusic, Bell, User, LogOut, Menu, X, Cpu, BellRing, LayoutDashboard, Tv2, Radio } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuthToken } from '../hooks/useAuthToken';

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperuser, userName, userEmail, userLinkingCode } = useAuthToken();

  const isIotActive = location.pathname.startsWith('/sensors');
  const activeModule: 'ads' | 'iot' = isIotActive ? 'iot' : 'ads';

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const adsNavItems = [
    { name: 'Pantallas', path: '/devices', icon: MonitorPlay },
    { name: 'Biblioteca', path: '/media', icon: Film },
    { name: 'Playlists', path: '/playlists', icon: ListMusic },
  ];

  const iotNavItems = [
    { name: 'Panorama General', path: '/sensors/dashboard', icon: LayoutDashboard },
    { name: 'Monitoreo', path: '/sensors', icon: Cpu },
    { name: 'Alertas', path: '/sensors/alerts', icon: BellRing },
  ];

  const currentNavItems = activeModule === 'iot' ? iotNavItems : adsNavItems;

  const ModuleSwitcher = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="p-3 bg-[#0B0F19] rounded-xl border border-white/5 mx-4 mt-4 grid grid-cols-2 gap-1.5 shadow-inner">
      <button
        onClick={() => {
          onNavigate?.();
          navigate('/devices');
        }}
        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
          activeModule === 'ads'
            ? 'bg-[#00F0FF] text-[#0a0d14] shadow-[0_0_12px_rgba(0,240,255,0.4)]'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Tv2 className="w-3.5 h-3.5" />
        ADS
      </button>
      <button
        onClick={() => {
          onNavigate?.();
          navigate('/sensors');
        }}
        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
          activeModule === 'iot'
            ? 'bg-[#00F0FF] text-[#0a0d14] shadow-[0_0_12px_rgba(0,240,255,0.4)]'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Radio className="w-3.5 h-3.5" />
        IoT
      </button>
    </div>
  );

  const NavSections = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 px-4 py-5 space-y-1">
      <h3 className="px-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
        {activeModule === 'iot' ? 'Módulo Sensores IoT' : 'Módulo Señalización ADS'}
      </h3>
      {currentNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end
          onClick={onNavigate}
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
  );

  const SidebarFooter = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="p-4 border-t border-white/5 space-y-2">
      {isSuperuser && (
        <button
          onClick={() => { onNavigate?.(); navigate('/admin'); }}
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
  );

  return (
    <div className="flex h-screen bg-[#0a0d14] overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#161C2D] border-r border-white/5">
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <Logo />
        </div>
        <ModuleSwitcher />
        <NavSections />
        <SidebarFooter />
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-[#161C2D] border-r border-white/5">
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
              <Logo />
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <ModuleSwitcher onNavigate={() => setIsMobileMenuOpen(false)} />
            <NavSections onNavigate={() => setIsMobileMenuOpen(false)} />
            <SidebarFooter onNavigate={() => setIsMobileMenuOpen(false)} />
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
                {userLinkingCode && (
                  <span className="text-[10px] text-[#00F0FF] bg-[#00F0FF]/15 border border-[#00F0FF]/30 px-2 py-0.5 rounded-full font-mono mt-1 inline-block">
                    Vinc: {userLinkingCode}
                  </span>
                )}
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
