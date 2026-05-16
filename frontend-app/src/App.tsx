import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import DashboardLayout from './layouts/DashboardLayout';
import DevicesManager from './features/devices/DevicesManager';
import MediaLibrary from './features/media/MediaLibrary';
import PlaylistBuilder from './features/playlists/PlaylistBuilder';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Componente para proteger rutas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <GoogleOAuthProvider clientId="78106457774-1u7cf3nl1fjuutl9q7sfvpdhvk8k5i8k.apps.googleusercontent.com">
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
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
