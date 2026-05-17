import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, LayoutDashboard } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { AuthService } from '../AuthService';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const data = await AuthService.login(email, password);
      localStorage.setItem('token', data.access_token);
      
      // Decodificar rol para redirección inteligente
      try {
        const base64Url = data.access_token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        if (payload && payload.is_superuser) {
          navigate('/admin');
          return;
        }
      } catch (e) {
        console.warn("Could not decode role, redirecting to devices by default:", e);
      }
      
      navigate('/devices');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await AuthService.loginWithGoogle(credentialResponse.credential);
      localStorage.setItem('token', data.access_token);
      
      // Decodificar rol para redirección inteligente
      try {
        const base64Url = data.access_token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        if (payload && payload.is_superuser) {
          navigate('/admin');
          return;
        }
      } catch (e) {
        console.warn("Could not decode role, redirecting to devices by default:", e);
      }

      navigate('/devices');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00F0FF] to-blue-600 mb-6 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
          <LayoutDashboard className="w-8 h-8 text-[#0B0F19]" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Bienvenido de nuevo</h1>
        <p className="text-gray-400">Ingresa a tu panel de ad-mesh</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1">Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#161C2D] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
              placeholder="tu@correo.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-sm font-medium text-gray-300">Contraseña</label>
            <a href="#" className="text-xs text-[#00F0FF] hover:underline">¿Olvidaste tu contraseña?</a>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#161C2D] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#00F0FF] hover:bg-[#00D1FF] text-[#0B0F19] font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0B0F19] px-4 text-gray-500">O continuar con</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Error al iniciar sesión con Google')}
            useOneTap
            theme="filled_black"
            shape="pill"
            width="350"
          />
        </div>
      </form>

      <p className="text-center mt-10 text-gray-400">
        ¿No tienes una cuenta?{' '}
        <Link to="/register" className="text-[#00F0FF] font-semibold hover:underline">Regístrate gratis</Link>
      </p>
    </div>
  );
}
