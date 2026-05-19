# 📺 ad-mesh — Raspberry Pi Player Client

Este es el cliente reproductor físico de cartelería digital para **ad-mesh**, optimizado para correr de forma **100% gratuita** (sin licencias de Balena) en una **Raspberry Pi 4B** utilizando un **disco duro USB (HDD)** como almacenamiento seguro.

## 🚀 Arquitectura del Player

El reproductor funciona mediante un enfoque **híbrido y Offline-First**:
1. **Navegador Nativo:** Chromium se ejecuta a pantalla completa en modo kiosco en el host, usando aceleración gráfica directa por hardware (GPU).
2. **Daemon en Docker:** Un servicio en segundo plano que se comunica con el servidor `ad-mesh`, reporta telemetría (temperatura de CPU, espacio en disco, IP), descarga los videos y los cachea directamente en el HDD.

---

## 🛠️ Guía de Arranque y Despliegue en la Raspberry Pi 4B

### 1. Llevar el código a la Raspberry Pi
En tu computadora de desarrollo, sube los cambios a tu repositorio Git:
```bash
git add player-client/
git commit -m "feat: add production player client daemon"
git push
```

En la **Raspberry Pi** (dentro del HDD USB), clona o actualiza el repositorio:
```bash
cd /home/pi/ad-mesh
git pull
```

### 2. Iniciar el Player Daemon (Docker)
Entra a la carpeta del reproductor en la Pi y levanta el contenedor con Docker Compose:
```bash
cd player-client
docker compose up -d --build
```

Esto iniciará el servicio local en segundo plano en el puerto `8080`.

### 3. Verificar el Funcionamiento
Una vez que el contenedor esté corriendo:
* Abre tu navegador o el Chromium en modo Kiosco de la Pi en `http://localhost:8080`.
* Deberías ver la **pantalla de emparejamiento con el logo de ad-mesh y un código de activación de 6 caracteres** (ej: `4X7G9B`).
* Copia este código, ve al panel web de administración de `ad-mesh` y vincula la pantalla.
* Una vez vinculada, la Pi comenzará a descargar automáticamente los videos al HDD y los reproducirá de inmediato sin parpadeos.

---

## ⚙️ Configuración y Variables de Entorno

En el archivo `player-client/docker-compose.yml` puedes editar la variable `BACKEND_URL` para apuntar a tu servidor de producción (VPS):

```yaml
environment:
  - BACKEND_URL=https://mi-servidor-admesh.com/api/v1
```

## 🧹 Limpieza Automática de Disco
El reproductor realiza un escaneo inteligente en el HDD cada vez que hay cambios en la lista de reproducción:
* Descarga los recursos nuevos.
* **Elimina físicamente los videos huérfanos** (videos viejos que ya no se usan en la playlist) para evitar llenar el HDD.
