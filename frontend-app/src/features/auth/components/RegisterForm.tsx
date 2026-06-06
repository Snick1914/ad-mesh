import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Loader2, Building2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { AuthService } from '../AuthService';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await AuthService.register(formData);
      // Auto login after registration or redirect to login
      navigate('/login');
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
        <div className="flex justify-center mb-6">
          <svg id="Capa_1" data-name="Capa 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 429.34 108.8" className="h-12 w-auto fill-white">
            <rect x="228.06" y="54.26" width="22.81" height="8.89"/>
            <path d="M83.8,37.29l-4.64,5.71-2.36,2.9-4.87,5.99-2.13,2.62-.57.7c-.86-.4-1.82-.62-2.83-.62-1.99,0-3.77.86-5.01,2.21l-20.05-10.65c.17-.56.26-1.15.26-1.76,0-3.42-2.78-6.2-6.2-6.2s-6.2,2.78-6.2,6.2c0,1.39.46,2.67,1.24,3.71l-15.53,28.48c-.45.82-.15,1.86.68,2.31.26.14.54.21.81.21.6,0,1.19-.32,1.49-.89l2.91-5.33v11.52c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-16c0-.33-.1-.63-.27-.89l4.07-7.46v29.35c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-33c0-.48-.22-.91-.55-1.2l2.74-5.01c.51.2,1.05.33,1.62.39v41.83c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-42.38c.55-.26,1.06-.59,1.51-.99l2.29,1.22v42.14c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-40.44l3.8,2.02v38.43c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-36.73l3.8,2.02v34.71c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-33.01l.79.42c-.12.51-.19,1.04-.19,1.59,0,2.43,1.28,4.56,3.2,5.76v25.24c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-24.22c.13,0,.26.02.4.02,1.24,0,2.4-.34,3.4-.92v24.12c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-28.39c.13-.52.2-1.05.2-1.61s-.07-1.09-.2-1.61v-3.82l3.8-4.68v37.1c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-41.04l3.8-4.68v40.72c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6v-44.66l3.8-4.68v40.33c0,.88.72,1.6,1.6,1.6s1.6-.72,1.6-1.6V29.96c.23-.66.04-1.41-.53-1.88-.73-.59-1.8-.48-2.39.25l-5.3,6.52-1.98,2.44Z"/>
            <path d="M54.4,0C24.4,0,0,24.4,0,54.4s24.4,54.4,54.4,54.4,54.4-24.4,54.4-54.4S84.4,0,54.4,0ZM54.4,106c-28.45,0-51.6-23.15-51.6-51.6S25.95,2.8,54.4,2.8s51.6,23.15,51.6,51.6-23.15,51.6-51.6,51.6Z"/>
            <path d="M99.4,67c.88,0,1.6-.72,1.6-1.6v-20c0-.88-.72-1.6-1.6-1.6s-1.6.72-1.6,1.6v20c0,.88.72,1.6,1.6,1.6Z"/>
            <path d="M209.46,47.55h-.03c-2.22-3.72-5.51-5.48-10.06-5.48-8.89,0-15.07,7.5-15.07,18.23s5.97,18.36,15.17,18.36c4.61,0,8.27-2.09,10.09-6.17h.03v5.41h11.32V28.43h-11.45v19.12ZM202.66,69.53c-4.19,0-6.78-3.45-6.78-9.22s2.59-9.14,6.78-9.14,7.27,3.59,7.27,9.14-2.95,9.22-7.27,9.22Z"/>
            <path d="M149.57,28.43l-17,49.47h12.98l3.02-9.53h17.56l2.92,9.53h13.34l-17.09-49.47h-15.74ZM151.56,59.04l.9-2.89c1.72-5.52,3.32-10.92,5-17,1.67,6.08,3.26,11.48,4.89,17l.89,2.89h-11.69Z"/>
            <path d="M335.63,42.04c-10.39,0-17.75,7.64-17.75,18.33s7.3,18.33,18.06,18.33c8.86,0,15.94-4.95,17.22-12.02h-10.25c-.83,2.32-3.22,3.78-6.58,3.78-4.52,0-7.17-2.83-7.3-7.27h24.39v-3.09c0-10.62-7.27-18.06-17.8-18.06ZM329.1,56.35c.5-3.69,2.99-5.88,6.84-5.88s6.33,2.19,6.83,5.88h-13.67Z"/>
            <path d="M301.13,42.07c-5,0-9.46,2.49-11.25,7.08-1.42-4.59-5.48-7.08-10.16-7.08s-8.7,2.33-10.73,7.34v-6.58h-10.99v35.06h11.42v-20.42c0-3.89,2.3-6.14,5.41-6.14s5.18,2.19,5.18,5.61v20.95h10.92v-20.65c0-3.55,2.06-5.91,5.31-5.91s5.28,2.03,5.28,5.75v20.81h11.45v-23.34c0-7.8-4.95-12.49-11.86-12.49Z"/>
            <path d="M417.29,42.07c-5.15,0-8.67,2.33-11.03,6.17v-19.82h-11.42v49.47h11.42v-19.06c0-4.78,2.33-7,5.94-7s5.72,2.25,5.72,6.41v19.66h11.42v-22.05c0-8.64-4.45-13.78-12.05-13.78Z"/>
            <path d="M379.56,57.15l-7.03-1.3c-2.42-.47-3.78-1.42-3.78-2.89,0-1.72,1.72-3.02,4.71-3.02s5.22,1.83,5.28,4.28h10.53c-.2-7.47-6.41-12.12-16.2-12.12s-15.7,4.45-15.7,11.39c0,5.55,3.69,9.09,10.59,10.33l6.34,1.13c2.78.5,4.25,1.43,4.25,2.95,0,1.76-1.86,3-5.02,3-3.36,0-5.39-1.64-5.72-4.22h-11.25c.63,7.47,7.44,12.08,17.13,12.08s16.47-4.84,16.47-12.05c0-5.22-3.38-8.23-10.59-9.56Z"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Crea tu cuenta</h1>
        <p className="text-gray-400">Empieza a gestionar tu red ad-mesh hoy</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1">Nombre Completo</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              name="full_name"
              required
              value={formData.full_name}
              onChange={handleChange}
              className="w-full bg-[#161C2D] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
              placeholder="Carlos Mendoza"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1">Nombre de la Empresa</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              name="company_name"
              required
              value={formData.company_name}
              onChange={handleChange}
              className="w-full bg-[#161C2D] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
              placeholder="Mi Empresa S.A."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1">Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-[#161C2D] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
              placeholder="tu@correo.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1">Teléfono</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-[#161C2D] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
              placeholder="+52 55 1234 5678"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-[#161C2D] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#00F0FF] hover:bg-[#00D1FF] text-[#0B0F19] font-bold py-4 rounded-xl mt-4 transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Cuenta'}
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0B0F19] px-4 text-gray-500">O regístrate con</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Error al registrarse con Google')}
            useOneTap
            theme="filled_black"
            shape="pill"
            width="100%"
          />
        </div>
      </form>

      <p className="text-center mt-8 text-gray-400 text-sm">
        ¿Ya tienes una cuenta?{' '}
        <Link to="/login" className="text-[#00F0FF] font-semibold hover:underline">Inicia Sesión</Link>
      </p>
    </div>
  );
}
