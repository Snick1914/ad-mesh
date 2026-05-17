# SESSION_CONTEXT — ad-mesh Backend

## Estado del Proyecto y Arquitectura

Este archivo mantiene el contexto de desarrollo del backend de **ad-mesh**, siguiendo los lineamientos de orden, modularidad y documentación del estándar de arquitectura DYA Cloud.

---

## 📈 Historial de Cambios y Estabilización (Sesión Actual)

### 1. 🔒 Transición a Bcrypt Nativo (Estabilización del Core de Seguridad)
*   **Problema**: La biblioteca obsoleta `passlib` causaba colisiones graves con versiones modernas de `bcrypt` (> 4.0.0) en entornos Python 3.11, arrojando excepciones `AttributeError: module 'bcrypt' has no attribute '__about__'` y `ValueError: password cannot be longer than 72 bytes` que bloqueaban el inicio de sesión.
*   **Solución**: Se erradicó por completo el `pwd_context` de `passlib` en `backend/app/core/security.py` y se reemplazó por la integración nativa y directa de `bcrypt` (`bcrypt.hashpw` y `bcrypt.checkpw`).
*   **Resultado**: Inicio de sesión local, por Google OAuth, y el endpoint de Swagger UI (`/docs`) funcionando al 100% con máxima velocidad, sin advertencias y con compatibilidad retroactiva absoluta.

### 📊 2. Telemetría Real del Servidor VPS (Admin Console)
*   **Problema**: El panel de administración SaaS consumía datos simulados para CPU, Memoria RAM, Almacenamiento total de disco y Conexiones de pantallas.
*   **Solución**: Se implementó en el endpoint `/api/v1/admin/summary` la recopilación directa a nivel de sistema operativo Linux:
    *   **RAM**: Análisis en tiempo real de `/proc/meminfo` para obtener uso exacto.
    *   **CPU**: Análisis dinámico y con delay de 50ms de `/proc/stat` para calcular el porcentaje de carga.
    *   **Almacenamiento**: Uso de la librería del kernel `shutil.disk_usage("/")` para reflejar exactamente el disco real de 100GB del VPS y sus gigabytes consumidos.
    *   **Pantallas**: Conexiones configuradas en `0` reales para coincidir con el estado actual de despliegue.

### 🔑 3. Claims Dinámicos en JWT (Roles y Perfil)
*   **Cambio**: Se modificó `create_access_token` para inyectar claims adicionales (`"email"`, `"full_name"`, `"is_superuser"`) dentro del cuerpo firmado del token JWT.
*   **Resultado**: El frontend decodifica el token instantáneamente para:
    1.  Redirigir automáticamente a los superusuarios a `/admin` tras loguearse.
    2.  Pintar dinámicamente el nombre y el correo real del administrador o del cliente en la barra de navegación superior derecha sin requerir consultas de red lentas.
    3.  Pintar el botón violeta brillante "Consola Admin" al final del sidebar cuando un administrador inspecciona la interfaz del cliente.### 📺 4. Módulo de Dispositivos Modular (`app/modules/devices/`)
*   **Cambio**: Implementamos la primera estructura física modular en el backend de **ad-mesh** siguiendo la arquitectura limpia de DYA Cloud.
*   **Detalles**:
    *   `models.py`: Modelo físico SQLAlchemy para pantallas (`Device`) con número de serie, códigos de emparejamiento, IP, telemetría y relaciones.
    *   `schemas.py`: Esquemas de validación de Pydantic.
    *   `services/device_service.py`: Lógica centralizada de emparejamiento, latidos e inyección de sesiones de base de datos.
    *   `endpoints/device_endpoints.py`: Endpoints limpios de API FastAPI.
    *   `alembic/versions/0f146c671298_add_device_model.py`: Migración de base de datos creada y lista para ejecutarse automáticamente.

### 📅 5. Módulo de Playlists Modular (`app/modules/playlists/`)
*   **Cambio**: Implementamos el motor relacional de listas de reproducción y campañas bajo la arquitectura modular DYA Cloud.
*   **Detalles**:
    *   `models.py`: Modelos físicos SQLAlchemy `Playlist` y `PlaylistItem` para gestionar secuencias ordenadas y tiempos de transición por pantalla con borrado seguro en cascada.
    *   `schemas.py`: Esquemas de entrada y salidas serializadas anidadas.
    *   `services/playlist_service.py`: Lógica transaccional de ordenamiento y control estricto de propiedad de medios.
    *   `endpoints/playlist_endpoints.py`: Endpoints limpios de API (Creación, modificación secuencial y borrado).
    *   `alembic/versions/f23b45678c9d_add_playlist_models.py`: Migración de base de datos creada y lista para su aplicación.

---

## 🗺️ Próximos Pasos y Roadmap

1.  **Refactorización a Estructura Modular (`app/modules/`)**:
    *   Continuar con la refactorización de otros módulos si se desea o enlazar las playlists con el reproductor físico para iniciar descargas automáticas en las pantallas.
2.  **Sincronización de Estructuras SQL**:
    *   Mantener el archivo `structure_auth.sql` sincronizado con cualquier migración nueva de Alembic para asegurar la recreación rápida del contenedor de base de datos desde cero.
