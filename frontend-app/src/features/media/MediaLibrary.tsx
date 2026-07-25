import React, { useState, useCallback, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Video, Trash2, Clock, HardDrive, Search, Film, Loader2 } from 'lucide-react';
import type { MediaItem, MediaType } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function MediaLibrary() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // SaaS Quota State
  const [usedStorageGb, setUsedStorageGb] = useState(0);
  const [maxStorageGb, setMaxStorageGb] = useState(10);

  const fetchMedia = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/media/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Error al obtener la biblioteca de medios.');
      }
      const data = await response.json();
      const mapped = data.map((d: any) => ({
        id: String(d.id),
        name: d.name,
        url: d.file_path.startsWith('http') ? d.file_path : `${API_URL.replace('/api/v1', '')}/${d.file_path}`,
        type: (d.file_type.startsWith('video') ? 'video' : 'image') as MediaType,
        size: Number((d.file_size_bytes / (1024 * 1024)).toFixed(2)),
        duration: d.file_type.startsWith('video') ? 15 : undefined,
      }));
      setMediaItems(mapped);

      // Calcular espacio consumido agregando el peso de los archivos
      const totalBytes = data.reduce((sum: number, item: any) => sum + item.file_size_bytes, 0);
      setUsedStorageGb(Number((totalBytes / (1024 * 1024 * 1024)).toFixed(3)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
    
    // Obtener límites del JWT
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        if (payload && payload.max_storage_gb) {
          setMaxStorageGb(payload.max_storage_gb);
        }
      }
    } catch (e) {
      console.warn("Could not decode limits from JWT:", e);
    }
  }, []);

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/media/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Error al eliminar el recurso.');
      }
      await fetchMedia();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_URL}/media/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || `Error al subir ${file.name}`);
        }
      }
      await fetchMedia();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  }, [mediaItems]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const filteredMedia = mediaItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
          {error}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Biblioteca de Medios
            {isLoading && <Loader2 className="w-5 h-5 text-[#00F0FF] animate-spin" />}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Sube y gestiona tus videos e imágenes para las listas de reproducción.</p>
        </div>
        <div className="flex items-center gap-4 bg-[#161C2D] border border-white/5 rounded-xl px-4 py-2 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <HardDrive className="w-4 h-4" />
            <span>Uso de Nube:</span>
          </div>
          <span className="font-bold text-white">{usedStorageGb} GB <span className="text-gray-500 font-normal">/ {maxStorageGb} GB</span></span>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
          isDragging 
            ? 'border-[#00F0FF] bg-[#00F0FF]/5' 
            : 'border-white/10 bg-[#161C2D] hover:border-white/20'
        }`}
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
          isDragging ? 'bg-[#00F0FF]/20 text-[#00F0FF]' : 'bg-white/5 text-gray-400'
        }`}>
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {isDragging ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para subir'}
        </h3>
        <p className="text-gray-400 text-sm mb-6 text-center max-w-md">
          Soporta MP4, MOV, JPG, PNG. Tamaño máximo por archivo: 500MB para videos, 20MB para imágenes.
        </p>
        
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          multiple 
          accept="video/mp4,video/quicktime,image/jpeg,image/png"
          onChange={handleFileInput}
        />
        <label 
          htmlFor="file-upload" 
          className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl font-medium cursor-pointer transition-colors border border-white/10"
        >
          Seleccionar Archivos
        </label>
      </div>

      <div className="bg-[#161C2D] p-4 rounded-2xl border border-white/5 relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input 
          type="text" 
          placeholder="Buscar archivo por nombre..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent transition-all"
        />
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredMedia.map(item => (
          <div key={item.id} className="bg-[#161C2D] border border-white/5 rounded-xl overflow-hidden group hover:border-white/20 transition-all flex flex-col relative">
            <div className="aspect-video bg-[#0B0F19] relative flex items-center justify-center overflow-hidden border-b border-white/5">
              {/* Thumbnail Placeholder */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
              {item.type === 'video' ? (
                <>
                  <Video className="w-10 h-10 text-gray-500/50 absolute" />
                  <video 
                    src={item.url} 
                    className="absolute inset-0 w-full h-full object-cover z-10" 
                    preload="metadata" 
                    muted 
                  />
                </>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-gray-500/50 absolute" />
                  <img 
                    src={item.url} 
                    alt={item.name} 
                    className="absolute inset-0 w-full h-full object-cover z-10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </>
              )}
              
              <div className="absolute top-2 left-2 flex gap-1">
                <span className="bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded font-medium border border-white/10 flex items-center gap-1">
                  {item.type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {item.type.toUpperCase()}
                </span>
              </div>
              
              {/* Hover Delete Button Overlay */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-all"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-3 flex flex-col flex-1">
              <h4 className="text-sm font-medium text-white truncate mb-2" title={item.name}>{item.name}</h4>
              <div className="mt-auto flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span>{item.size} MB</span>
                  {item.duration && (
                    <span className="flex items-center gap-1 border-l border-white/10 pl-2"><Clock className="w-3 h-3" /> {item.duration}s</span>
                  )}
                </div>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/10 z-20 relative"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMedia.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#161C2D] border border-white/5 rounded-2xl p-12 text-center">
          <Film className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Biblioteca vacía</h3>
          <p className="text-gray-400">Sube archivos multimedia para empezar.</p>
        </div>
      )}
    </div>
  );
}
