import { useState, useMemo, useEffect } from 'react';
import { Plus, GripVertical, Clock, Save, Play, X, Image as ImageIcon, Loader2, AlertCircle, CheckCircle2, Edit2 } from 'lucide-react';
import type { MediaItem, MediaType, PlaylistItem } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function PlaylistBuilder() {
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [playlistName, setPlaylistName] = useState('Nueva Playlist Comercial');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const totalDuration = useMemo(() => {
    return playlistItems.reduce((acc, item) => acc + item.duration, 0);
  }, [playlistItems]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Cargar biblioteca y playlist activa en el inicio
  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      // 1. Obtener recursos multimedia del usuario
      const mediaResponse = await fetch(`${API_URL}/media/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!mediaResponse.ok) {
        throw new Error('Error al obtener la biblioteca de medios.');
      }
      const mediaData = await mediaResponse.json();
      const mappedMedia: MediaItem[] = mediaData.map((d: any) => ({
        id: String(d.id),
        name: d.name,
        url: d.file_path.startsWith('http') ? d.file_path : `${API_URL.replace('/api/v1', '')}/${d.file_path}`,
        type: (d.file_type.startsWith('video') ? 'video' : 'image') as MediaType,
        size: Number((d.file_size_bytes / (1024 * 1024)).toFixed(2)),
        duration: d.file_type.startsWith('video') ? 15 : undefined,
      }));
      setMediaItems(mappedMedia);

      // 2. Obtener playlists existentes para buscar la activa y cargarla
      const playlistsResponse = await fetch(`${API_URL}/playlists/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (playlistsResponse.ok) {
        const playlists = await playlistsResponse.json();
        const activePlaylist = playlists.find((p: any) => p.is_active);
        if (activePlaylist) {
          setActivePlaylistId(String(activePlaylist.id));
          setPlaylistName(activePlaylist.name);
          const mappedItems: PlaylistItem[] = activePlaylist.items.map((item: any) => ({
            id: String(item.id),
            mediaItem: {
              id: String(item.media.id),
              name: item.media.name,
              url: item.media.file_path.startsWith('http') ? item.media.file_path : `${API_URL.replace('/api/v1', '')}/${item.media.file_path}`,
              type: (item.media.file_type.startsWith('video') ? 'video' : 'image') as MediaType,
              size: Number((item.media.file_size_bytes / (1024 * 1024)).toFixed(2)),
              duration: item.media.file_type.startsWith('video') ? 15 : undefined,
            },
            duration: item.duration_seconds,
            transition: 'Fade'
          }));
          setPlaylistItems(mappedItems);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddToPlaylist = (media: MediaItem) => {
    const newItem: PlaylistItem = {
      id: Math.random().toString(36).substring(2, 11),
      mediaItem: media,
      duration: media.type === 'video' ? (media.duration || 15) : 10, // Default 10s para imágenes
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

  const handleSavePlaylist = async () => {
    if (playlistItems.length === 0) {
      setError('Por favor añade al menos un elemento de la librería a la línea de tiempo.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      let targetPlaylistId = activePlaylistId;

      // 1. Si no existe una playlist activa cargada, crearla primero
      if (!targetPlaylistId) {
        const createResponse = await fetch(`${API_URL}/playlists/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: playlistName,
            is_active: true
          })
        });

        if (!createResponse.ok) {
          throw new Error('Error al crear la lista de reproducción.');
        }

        const newPlaylist = await createResponse.json();
        targetPlaylistId = String(newPlaylist.id);
        setActivePlaylistId(targetPlaylistId);
      }

      // 2. Guardar/actualizar la secuencia de medios y el nombre en la playlist
      const itemsPayload = {
        name: playlistName,
        items: playlistItems.map((item, index) => ({
          media_id: parseInt(item.mediaItem.id),
          position: index + 1,
          duration_seconds: item.duration
        }))
      };

      const updateResponse = await fetch(`${API_URL}/playlists/${targetPlaylistId}/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(itemsPayload)
      });

      if (!updateResponse.ok) {
        throw new Error('Error al guardar los recursos de medios en la lista de reproducción.');
      }

      setSuccessMessage('¡Lista de reproducción guardada y publicada en la nube! Tu Raspberry Pi se actualizará en unos segundos.');
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Mensajes de feedback */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex items-center gap-2 max-w-md group">
            <input 
              type="text" 
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="text-2xl font-bold text-white bg-transparent border-b border-white/15 hover:border-white/30 focus:border-[#00F0FF] focus:outline-none px-0 py-1 transition-all flex-1"
              placeholder="Nombre de la Playlist"
            />
            <Edit2 className="w-4 h-4 text-gray-500 group-hover:text-white/60 transition-colors shrink-0" />
          </div>
          <p className="text-gray-400 text-sm mt-2 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Duración total: <span className="text-white font-mono font-medium bg-white/10 px-2 py-0.5 rounded">{formatTime(totalDuration)}</span>
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all">
            <Play className="w-4 h-4" /> Previsualizar
          </button>
          <button 
            onClick={handleSavePlaylist}
            disabled={isSaving}
            className="flex-1 sm:flex-none bg-[#00F0FF] hover:bg-[#00D1FF] disabled:bg-[#00F0FF]/50 disabled:cursor-not-allowed text-[#0B0F19] px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar y Publicar
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
        {/* Left Side: Media Library */}
        <div className="w-full lg:w-1/3 bg-[#161C2D] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-[#161C2D]/80 backdrop-blur-md flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-white">Librería</h3>
              <p className="text-xs text-gray-400">Clic para añadir a la línea de tiempo</p>
            </div>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#00F0FF]" />}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mediaItems.length === 0 && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <ImageIcon className="w-8 h-8 text-gray-600 mb-2" />
                <p className="text-sm text-gray-400">Biblioteca vacía</p>
                <p className="text-xs text-gray-500 mt-1">Sube fotos o videos primero en la pestaña "Biblioteca".</p>
              </div>
            ) : (
              mediaItems.map(media => (
                <div 
                  key={media.id} 
                  onClick={() => handleAddToPlaylist(media)}
                  className="group flex gap-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all items-center"
                >
                  <div className="w-16 h-12 bg-[#0B0F19] rounded flex items-center justify-center shrink-0 border border-white/5 relative overflow-hidden">
                    {media.type === 'video' ? (
                      <video src={media.url} className="w-full h-full object-cover" preload="metadata" muted />
                    ) : (
                      <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                    )}
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
              ))
            )}
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

                  <div className="w-20 h-14 bg-[#0B0F19] rounded border border-white/5 flex items-center justify-center shrink-0 relative overflow-hidden">
                    {item.mediaItem.type === 'video' ? (
                      <video src={item.mediaItem.url} className="w-full h-full object-cover" preload="metadata" muted />
                    ) : (
                      <img src={item.mediaItem.url} alt={item.mediaItem.name} className="w-full h-full object-cover" />
                    )}
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
                          disabled={item.mediaItem.type === 'video'} // Duración fija para video
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
