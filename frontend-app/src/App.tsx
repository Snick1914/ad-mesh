import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import DashboardLayout from './layouts/DashboardLayout';
import DevicesManager from './features/devices/DevicesManager';
import MediaLibrary from './features/media/MediaLibrary';
import PlaylistBuilder from './features/playlists/PlaylistBuilder';
import IotTelemetry from './features/telemetry/IotTelemetry';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersManager from './pages/admin/AdminUsersManager';
import AdminDevicesManager from './pages/admin/AdminDevicesManager';

// Componente para proteger rutas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Banner para cuando el admin está impersonando a un cliente
const ImpersonationBanner = () => {
  const adminToken = localStorage.getItem('admin_token');
  if (!adminToken) return null;

  const handleReturn = () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      localStorage.setItem('token', token);
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/users';
    }
  };

  return (
    <div className="bg-[#7000FF] text-white text-xs py-2.5 px-4 flex items-center justify-between font-semibold shadow-lg z-50 relative">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Estás simulando la cuenta de un cliente (Modo de Soporte).</span>
      </div>
      <button 
        onClick={handleReturn}
        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg border border-white/10 transition-all font-bold text-[10px]"
      >
        Volver a Admin
      </button>
    </div>
  );
};

function App() {
  return (
    <GoogleOAuthProvider clientId="78106457774-1u7cf3nl1fjuutl9q7sfvpdhvk8k5i8k.apps.googleusercontent.com">
      <div className="flex flex-col min-h-screen">
        <ImpersonationBanner />
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Rutas Protegidas */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/devices" replace />} />
              <Route path="devices" element={<DevicesManager />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="playlists" element={<PlaylistBuilder />} />
              <Route path="telemetry" element={<IotTelemetry />} />
            </Route>

            {/* Rutas Protegidas Administrador Global */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsersManager />} />
              <Route path="devices" element={<AdminDevicesManager />} />
            </Route>

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
