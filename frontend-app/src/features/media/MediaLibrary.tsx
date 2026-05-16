import { useState, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Video, Trash2, Clock, HardDrive, Search, Film } from 'lucide-react';
import type { MediaItem } from '../../types';

const INITIAL_MEDIA: MediaItem[] = [
  { id: 'm1', name: 'promo_verano_2024.mp4', url: '#', type: 'video', size: 45.2, duration: 30 },
  { id: 'm2', name: 'menu_desayunos.jpg', url: '#', type: 'image', size: 2.1 },
  { id: 'm3', name: 'oferta_flash_fin_semana.mp4', url: '#', type: 'video', size: 15.8, duration: 15 },
  { id: 'm4', name: 'qr_encuesta_satisfaccion.jpg', url: '#', type: 'image', size: 1.5 },
];

export default function MediaLibrary() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(INITIAL_MEDIA);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMedia = mediaItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setMediaItems(mediaItems.filter(item => item.id !== id));
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
    
    // Simulate file upload
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const newItems: MediaItem[] = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: '#',
        type: file.type.startsWith('video') ? 'video' : 'image',
        size: Number((file.size / (1024 * 1024)).toFixed(2)),
        duration: file.type.startsWith('video') ? 15 : undefined, // mock duration
      }));
      setMediaItems([...mediaItems, ...newItems]);
    }
  }, [mediaItems]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newItems: MediaItem[] = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: '#',
        type: file.type.startsWith('video') ? 'video' : 'image',
        size: Number((file.size / (1024 * 1024)).toFixed(2)),
        duration: file.type.startsWith('video') ? 15 : undefined,
      }));
      setMediaItems([...mediaItems, ...newItems]);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Biblioteca de Medios</h1>
          <p className="text-gray-400 text-sm mt-1">Sube y gestiona tus videos e imágenes para las listas de reproducción.</p>
        </div>
        <div className="flex items-center gap-4 bg-[#161C2D] border border-white/5 rounded-xl px-4 py-2 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <HardDrive className="w-4 h-4" />
            <span>Uso de Nube:</span>
          </div>
          <span className="font-bold text-white">12.5 GB <span className="text-gray-500 font-normal">/ 100 GB</span></span>
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
                <Video className="w-10 h-10 text-gray-500/50" />
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-500/50" />
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
                <span>{item.size} MB</span>
                {item.duration && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.duration}s</span>
                )}
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
