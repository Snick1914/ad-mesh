const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000/api/v1';

// Rutas de almacenamiento
const DATA_DIR = path.join(__dirname, 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const CONFIG_FILE = path.join(DATA_DIR, 'device.json');
const PLAYLIST_FILE = path.join(DATA_DIR, 'playlist.json');

// Crear directorios necesarios
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

// Middleware para servir archivos locales
app.use(express.json());
// Servir la interfaz gráfica del player
app.use(express.static(path.join(__dirname, 'public')));
// Servir los archivos de video e imagen descargados en el HDD
app.use('/media', express.static(MEDIA_DIR));

// --- ⚙️ OBTENER SERIAL DE HARDWARE REAL ---
const getDeviceSerial = () => {
  try {
    // Intentar leer el serial de la CPU de la Raspberry Pi
    if (fs.existsSync('/proc/cpuinfo')) {
      const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
      const match = cpuInfo.match(/Serial\s*:\s*([0-9a-fA-F]+)/);
      if (match && match[1] && match[1] !== '0000000000000000') {
        return `PI4-${match[1].toUpperCase()}`;
      }
    }
  } catch (e) {
    console.error("Error leyendo serial de hardware, usando fallback:", e.message);
  }

  // Fallback: Cargar o generar un ID único persistente
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (config.serial_number) return config.serial_number;
    } catch (e) {}
  }

  const generatedSerial = `ADM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ serial_number: generatedSerial, is_paired: false }));
  return generatedSerial;
};

const DEVICE_SERIAL = getDeviceSerial();
console.log(`[DEVICE] Iniciando reproductor con número de serie: ${DEVICE_SERIAL}`);

// --- 📊 METRICAS EN TIEMPO REAL (TELEMETRÍA DE LA PI) ---
const getSystemMetrics = () => {
  let temp = 0.0;
  let ramUsed = 0.0;
  
  // 1. Obtener Temperatura de CPU en Raspberry Pi (Linux)
  try {
    if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
      const rawTemp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
      temp = parseFloat(rawTemp) / 1000.0;
    }
  } catch (e) {}

  // 2. Obtener RAM Usada (Linux /proc/meminfo)
  try {
    if (fs.existsSync('/proc/meminfo')) {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
      const memTotalMatch = meminfo.match(/MemTotal:\s*(\d+)/);
      const memAvailableMatch = meminfo.match(/MemAvailable:\s*(\d+)/);
      if (memTotalMatch && memAvailableMatch) {
        const total = parseInt(memTotalMatch[1]);
        const available = parseInt(memAvailableMatch[1]);
        ramUsed = (total - available) / 1024 / 1024; // GBs usados
      }
    }
  } catch (e) {}

  // 3. Obtener Espacio en el Disco HDD (USB) en GB
  let storageUsed = 0.0;
  try {
    const stats = fs.statfsSync(MEDIA_DIR);
    const totalBytes = stats.bsize * stats.blocks;
    const freeBytes = stats.bsize * stats.bavail;
    storageUsed = (totalBytes - freeBytes) / (1024 * 1024 * 1024); // GBs usados
  } catch (e) {}

  return {
    cpu_temp: parseFloat(temp.toFixed(1)),
    storage_used_gb: parseFloat(storageUsed.toFixed(2)),
    ip_address: getLocalIpAddress()
  };
};

const getLocalIpAddress = () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Ignorar interfaces loopback e IPv6
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
};

// --- 🌐 DESCARGADOR INTELIGENTE DE ARCHIVOS MULTIMEDIA ---
const downloadFile = async (url, destPath) => {
  console.log(`[DESCARGAS] Iniciando descarga de: ${url}`);
  const writer = fs.createWriteStream(destPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

// --- 🔄 BUCLE PRINCIPAL DE SINCRONIZACIÓN Y LATIDOS ---
let isSyncing = false;

const syncLoop = async () => {
  if (isSyncing) return;
  isSyncing = true;

  try {
    // 1. Cargar estado local
    let deviceState = { is_paired: false, pairing_code: "" };
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        deviceState = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } catch (e) {}
    }

    const metrics = getSystemMetrics();

    // 2. Si no está emparejado, pedir código de vinculación al Backend
    if (!deviceState.is_paired) {
      console.log(`[PAIRED] Dispositivo no emparejado. Consultando código...`);
      try {
        const response = await axios.post(`${BACKEND_URL}/devices/request-pairing`, {
          serial_number: DEVICE_SERIAL
        });
        
        deviceState.pairing_code = response.data.pairing_code;
        deviceState.is_paired = response.data.is_paired;
        
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(deviceState, null, 2));
      } catch (e) {
        console.error(`[PAIRED] Error solicitando código al backend:`, e.message);
        if (deviceState.pairing_code !== "") {
          deviceState.pairing_code = "";
          try {
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(deviceState, null, 2));
          } catch (writeErr) {}
        }
      }
      isSyncing = false;
      return;
    }

    // 3. Enviar Heartbeat (Latido) si ya está emparejado
    console.log(`[HEARTBEAT] Enviando signos vitales (Temp: ${metrics.cpu_temp}°C, IP: ${metrics.ip_address})`);
    try {
      await axios.post(`${BACKEND_URL}/devices/${DEVICE_SERIAL}/heartbeat`, {
        ip_address: metrics.ip_address,
        storage_used_gb: metrics.storage_used_gb,
        status: "online"
      });
    } catch (e) {
      console.error(`[HEARTBEAT] Error enviando latido:`, e.message);
    }

    // 4. Obtener Playlist asignada
    console.log(`[PLAYLIST] Buscando playlist activa...`);
    const playlistResponse = await axios.get(`${BACKEND_URL}/devices/${DEVICE_SERIAL}/playlist`);
    const activeConfig = playlistResponse.data;

    // Verificar si hay alguna playlist en cualquier zona
    const hasPlaylist = activeConfig.zone_a?.playlist_id || activeConfig.zone_b?.playlist_id || activeConfig.zone_c?.playlist_id;

    if (!hasPlaylist) {
      console.log(`[PLAYLIST] Sin playlist activa asignada en el servidor.`);
      fs.writeFileSync(PLAYLIST_FILE, JSON.stringify({ layout: 'single', resolution: '1920x1080', zone_a: { items: [] }, zone_b: { items: [] }, zone_c: { items: [] } }, null, 2));
      isSyncing = false;
      return;
    }

    const backendBaseUrl = BACKEND_URL.replace('/api/v1', ''); // Limpia URL para descargar recursos estáticos
    const mediaFilesOnServer = [];

    // Helper para procesar y descargar elementos de una zona
    const processZone = async (zoneData) => {
      if (!zoneData || !zoneData.items) return { playlist_id: null, name: "Sin Playlist", items: [] };
      const downloadedItems = [];
      for (const item of zoneData.items) {
        const fileName = path.basename(item.file_path);
        const localFilePath = path.join(MEDIA_DIR, fileName);
        const absoluteMediaUrl = `${backendBaseUrl}/${item.file_path}`;
        
        mediaFilesOnServer.push(fileName);

        // Descargar archivo si no existe localmente
        if (!fs.existsSync(localFilePath)) {
          try {
            await downloadFile(absoluteMediaUrl, localFilePath);
            console.log(`[DESCARGAS] Sincronizado con éxito: ${fileName}`);
          } catch (downloadErr) {
            console.error(`[DESCARGAS] Error descargando archivo ${fileName}:`, downloadErr.message);
            continue; // Intentar con el siguiente
          }
        }

        downloadedItems.push({
          id: item.id,
          name: item.name,
          local_path: `/media/${fileName}`, // Ruta accesible desde el servidor local de la Pi
          file_type: item.file_type,
          position: item.position,
          duration_seconds: item.duration_seconds
        });
      }
      return {
        playlist_id: zoneData.playlist_id,
        name: zoneData.name,
        items: downloadedItems
      };
    };

    console.log(`[PLAYLIST] Procesando y descargando recursos de zonas...`);
    const zoneA = await processZone(activeConfig.zone_a);
    const zoneB = await processZone(activeConfig.zone_b);
    const zoneC = await processZone(activeConfig.zone_c);

    // 6. Limpiar archivos huérfanos del HDD (videos antiguos que ya no se usan)
    try {
      const localFiles = fs.readdirSync(MEDIA_DIR);
      localFiles.forEach(file => {
        if (!mediaFilesOnServer.includes(file)) {
          console.log(`[LIMPIEZA] Eliminando archivo huérfano del HDD: ${file}`);
          fs.unlinkSync(path.join(MEDIA_DIR, file));
        }
      });
    } catch (cleanErr) {
      console.error(`[LIMPIEZA] Error de limpieza de disco:`, cleanErr.message);
    }

    // 7. Guardar la nueva estructura local
    const localConfig = {
      serial_number: DEVICE_SERIAL,
      layout: activeConfig.layout || 'single',
      resolution: activeConfig.resolution || '1920x1080',
      zone_a: zoneA,
      zone_b: zoneB,
      zone_c: zoneC,
      // Mapear compatibilidad para reproductores heredados que esperan single playlist a nivel raíz
      playlist_id: zoneA.playlist_id,
      name: zoneA.name,
      items: zoneA.items
    };

    fs.writeFileSync(PLAYLIST_FILE, JSON.stringify(localConfig, null, 2));
    console.log(`[PLAYLIST] Configuración multi-zona (${activeConfig.layout}) sincronizada con éxito.`);

  } catch (err) {
    console.error(`[🔄 BUCLE] Error general en el bucle de sincronización:`, err.message);
    
    // Si el backend dice que el dispositivo no se encuentra, desvincularlo localmente para forzar emparejamiento
    if (err.response && err.response.status === 404) {
      console.log(`[PAIRED] Dispositivo no encontrado en base de datos. Reseteando vinculación...`);
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ is_paired: false, pairing_code: "" }, null, 2));
    }
  } finally {
    isSyncing = false;
  }
};

// Arrancar bucle de sincronización cada 15 segundos
setInterval(syncLoop, 15000);
// Primer disparo a los 3 segundos de encender la Pi
setTimeout(syncLoop, 3000);

// --- 🔌 ENDPOINTS API LOCALES (PARA EL REPRODUCTOR HTML5 EN HDMI) ---

// Obtener el estado actual del dispositivo (vinculado, código, playlist)
app.get('/api/local/state', (req, res) => {
  let deviceState = { is_paired: false, pairing_code: "" };
  let playlist = { playlist_id: null, items: [] };

  try {
    if (fs.existsSync(CONFIG_FILE)) deviceState = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (fs.existsSync(PLAYLIST_FILE)) playlist = JSON.parse(fs.readFileSync(PLAYLIST_FILE, 'utf8'));
  } catch (e) {}

  res.json({
    serial_number: DEVICE_SERIAL,
    is_paired: deviceState.is_paired,
    pairing_code: deviceState.pairing_code,
    playlist: playlist
  });
});

// Arrancar Servidor Web
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Reproductor local de ad-mesh escuchando en http://localhost:${PORT}`);
});
