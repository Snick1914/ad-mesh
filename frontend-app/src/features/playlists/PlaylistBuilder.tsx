import { useState, useMemo } from 'react';
import { Plus, GripVertical, Clock, Save, Play, X, Image as ImageIcon, Video } from 'lucide-react';
import type { MediaItem, PlaylistItem } from '../../types';

const MOCK_LIBRARY: MediaItem[] = [
  { id: 'm1', name: 'promo_verano_2024.mp4', url: '#', type: 'video', size: 45.2, duration: 30 },
  { id: 'm2', name: 'menu_desayunos.jpg', url: '#', type: 'image', size: 2.1 },
  { id: 'm3', name: 'oferta_flash_fin_semana.mp4', url: '#', type: 'video', size: 15.8, duration: 15 },
  { id: 'm4', name: 'qr_encuesta_satisfaccion.jpg', url: '#', type: 'image', size: 1.5 },
  { id: 'm5', name: 'cierre_sucursal_aviso.png', url: '#', type: 'image', size: 0.8 },
];

export default function PlaylistBuilder() {
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [playlistName, setPlaylistName] = useState('Nueva Playlist Comercial');

  const totalDuration = useMemo(() => {
    return playlistItems.reduce((acc, item) => acc + item.duration, 0);
  }, [playlistItems]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddToPlaylist = (media: MediaItem) => {
    const newItem: PlaylistItem = {
      id: Math.random().toString(36).substr(2, 9),
      mediaItem: media,
      duration: media.type === 'video' ? (media.duration || 15) : 10, // Default 10s for images
      transition: 'Fade'
    };
    setPlaylistItems([...playlistItems, newItem]);
  };

  const handleRemoveFromPlaylist = (id: string) => {
    setPlaylistItems(playlistItems.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<PlaylistItem>) => {
    setPlaylistItems(playlistItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <input 
            type="text" 
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            className="text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#00F0FF] focus:outline-none px-0 py-1 transition-all w-full max-w-md"
            placeholder="Nombre de la Playlist"
          />
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Duración total: <span className="text-white font-mono font-medium bg-white/10 px-2 py-0.5 rounded">{formatTime(totalDuration)}</span>
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all">
            <Play className="w-4 h-4" /> Previsualizar
          </button>
          <button className="flex-1 sm:flex-none bg-[#00F0FF] hover:bg-[#00D1FF] text-[#0B0F19] px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Save className="w-4 h-4" /> Guardar y Publicar
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
        {/* Left Side: Media Library */}
        <div className="w-full lg:w-1/3 bg-[#161C2D] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-[#161C2D]/80 backdrop-blur-md">
            <h3 className="font-semibold text-white">Librería</h3>
            <p className="text-xs text-gray-400">Clic para añadir a la línea de tiempo</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {MOCK_LIBRARY.map(media => (
              <div 
                key={media.id} 
                onClick={() => handleAddToPlaylist(media)}
                className="group flex gap-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all items-center"
              >
                <div className="w-16 h-12 bg-[#0B0F19] rounded flex items-center justify-center shrink-0 border border-white/5 relative overflow-hidden">
                  {media.type === 'video' ? <Video className="w-5 h-5 text-gray-500" /> : <ImageIcon className="w-5 h-5 text-gray-500" />}
                  {media.type === 'video' && <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] px-1 text-white">{media.duration}s</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate group-hover:text-[#00F0FF] transition-colors">{media.name}</h4>
                  <p className="text-xs text-gray-500 uppercase">{media.type}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2">
                  <Plus className="w-5 h-5 text-[#00F0FF]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Timeline Builder */}
        <div className="w-full lg:w-2/3 bg-[#161C2D] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-[#161C2D]/80 backdrop-blur-md flex justify-between items-center">
            <h3 className="font-semibold text-white">Línea de Tiempo ({playlistItems.length} elementos)</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0B0F19]/50">
            {playlistItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 border-dashed">
                  <Plus className="w-6 h-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">Playlist Vacía</h3>
                <p className="text-sm text-gray-400">Selecciona elementos de la librería a la izquierda para empezar a construir tu secuencia.</p>
              </div>
            ) : (
              playlistItems.map((item, index) => (
                <div key={item.id} className="bg-[#161C2D] border border-white/10 rounded-xl flex items-center p-3 gap-4 group hover:border-white/20 transition-all relative">
                  <div className="text-gray-500 cursor-grab hover:text-white">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                    {index + 1}
                  </div>

                  <div className="w-20 h-14 bg-[#0B0F19] rounded border border-white/5 flex items-center justify-center shrink-0">
                    {item.mediaItem.type === 'video' ? <Video className="w-6 h-6 text-gray-600" /> : <ImageIcon className="w-6 h-6 text-gray-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate mb-1">{item.mediaItem.name}</h4>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">Duración (s):</label>
                        <input 
                          type="number" 
                          min="1"
                          value={item.duration}
                          onChange={(e) => updateItem(item.id, { duration: parseInt(e.target.value) || 1 })}
                          className="w-16 bg-[#0B0F19] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                          disabled={item.mediaItem.type === 'video'} // Usually video duration is fixed
                          title={item.mediaItem.type === 'video' ? "Duración fijada por el video" : ""}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">Animación:</label>
                        <select 
                          value={item.transition}
                          onChange={(e) => updateItem(item.id, { transition: e.target.value as any })}
                          className="bg-[#0B0F19] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                        >
                          <option value="None">Sin Transición</option>
                          <option value="Fade">Fade</option>
                          <option value="Slide Left">Slide Left</option>
                          <option value="Zoom">Zoom</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleRemoveFromPlaylist(item.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
