export interface User {
  id: string;
  email: string;
  company: string;
  role: 'admin' | 'editor' | 'viewer';
}

export type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'syncing';

export interface Device {
  id: string;
  serialNumber: string;
  name: string;
  status: DeviceStatus;
  lastHeartbeat: string;
  currentPlaylistId?: string;
  storageUsed: number; // in GB
  storageTotal: number; // in GB
  resolution?: string;
  layout?: 'single' | 'split-h' | 'split-v' | 'l-shape';
  layout_config?: Record<string, any> | null;
  playlist_id?: number | null;
  playlist_b_id?: number | null;
  playlist_c_id?: number | null;
}

export type MediaType = 'video' | 'image';

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: MediaType;
  size: number; // in MB
  duration?: number; // in seconds, mainly for video or specific image duration
  expiresAt?: string;
}

export interface PlaylistItem {
  id: string; // unique id for this item in the playlist
  mediaItem: MediaItem;
  duration: number; // in seconds
  transition: 'Fade' | 'Slide Left' | 'Zoom' | 'None';
}

export interface Playlist {
  id: string;
  name: string;
  itemsCount: number;
  totalDuration: number;
  items: PlaylistItem[];
}
