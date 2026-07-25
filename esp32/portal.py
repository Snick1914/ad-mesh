import socket
import ujson
import time
from machine import reset
import button_handler

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuración WiFi - AD-Mesh</title>
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: rgba(255, 255, 255, 0.05);
            --border-color: rgba(255, 255, 255, 0.1);
            --text-color: #f3f4f6;
            --accent-color: #3b82f6;
            --accent-hover: #2563eb;
        }
        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background: var(--card-bg);
            backdrop-filter: blur(10px);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 2.5rem;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        h2 {
            margin-top: 0;
            font-weight: 600;
            text-align: center;
            background: linear-gradient(45deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            text-align: center;
            color: #9ca3af;
            font-size: 0.9rem;
            margin-bottom: 2rem;
        }
        .form-group { margin-bottom: 1.5rem; }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-size: 0.85rem;
            color: #9ca3af;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 0.75rem 1rem;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: #fff;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
        }
        input[type="text"]:focus, input[type="password"]:focus {
            border-color: var(--accent-color);
        }
        button {
            width: 100%;
            padding: 0.75rem;
            background: var(--accent-color);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover { background: var(--accent-hover); }
        .footer {
            margin-top: 2rem;
            text-align: center;
            font-size: 0.75rem;
            color: #4b5563;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>AD-Mesh</h2>
        <p>Configuración de Red WiFi para el dispositivo</p>
        <form method="POST" action="/save">
            <div class="form-group">
                <label for="ssid">SSID (Nombre de Red)</label>
                <input type="text" id="ssid" name="ssid" placeholder="Introduce el SSID..." required>
            </div>
            <div class="form-group">
                <label for="password">Contraseña</label>
                <input type="password" id="password" name="password" placeholder="••••••••" required>
            </div>
            <div class="form-group">
                <label for="linking_code">Código de Vinculación (Usuario)</label>
                <input type="text" id="linking_code" name="linking_code" placeholder="Ej: USR-ABC12345" required>
            </div>
            <button type="submit">Guardar y Conectar</button>
        </form>
        <div class="footer">ESP32 Telemetry Node – AD-Mesh</div>
    </div>
</body>
</html>
"""

HTML_SUCCESS = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuración Guardada</title>
    <style>
        body {
            background-color: #0b0f19;
            color: #f3f4f6;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; margin: 0;
        }
        .container {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px; padding: 2.5rem; text-align: center; max-width: 400px;
        }
        h2 { color: #10b981; }
        p  { color: #9ca3af; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="container">
        <h2>¡Configuración Guardada!</h2>
        <p>El dispositivo se está reiniciando para conectarse a la nueva red WiFi.</p>
        <p>Puedes cerrar esta ventana.</p>
    </div>
</body>
</html>
"""


def url_decode(s):
    res = ""
    i = 0
    while i < len(s):
        if s[i] == '%':
            try:
                res += chr(int(s[i+1:i+3], 16))
                i += 3
            except Exception:
                res += s[i]; i += 1
        elif s[i] == '+':
            res += ' '; i += 1
        else:
            res += s[i]; i += 1
    return res


def parse_post_data(request_str):
    try:
        parts = request_str.split("\r\n\r\n")
        if len(parts) < 2:
            return {}
        params = {}
        for pair in parts[1].split("&"):
            if "=" in pair:
                k, v = pair.split("=", 1)
                params[k] = url_decode(v)
        return params
    except Exception:
        return {}


def iniciar_servidor_configuracion(wdt=None):
    """Servidor web en puerto 80 para configurar credenciales WiFi."""
    addr = socket.getaddrinfo('0.0.0.0', 80)[0][-1]
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(addr)
    s.listen(1)
    print("Servidor de configuración en http://192.168.4.1")

    guardado = False
    while not guardado:
        button_handler.chequear_boton(wdt)
        if wdt:
            wdt.feed()

        try:
            s.settimeout(1.0)
            conn, _ = s.accept()
        except OSError:
            continue

        if wdt:
            wdt.feed()

        try:
            conn.settimeout(2.0)
            request_bytes = b""
            while b"\r\n\r\n" not in request_bytes:
                chunk = conn.recv(512)
                if not chunk:
                    break
                request_bytes += chunk
                if len(request_bytes) > 2048:
                    break

            if not request_bytes:
                conn.close()
                continue

            request = request_bytes.decode('utf-8', 'ignore')

            if "POST" in request:
                content_length = 0
                for line in request.split("\r\n"):
                    if line.lower().startswith("content-length:"):
                        try:
                            content_length = int(line.split(":")[1].strip())
                        except Exception:
                            pass
                        break
                parts = request.split("\r\n\r\n")
                cuerpo = parts[1] if len(parts) > 1 else ""
                bytes_leidos = len(cuerpo.encode('utf-8'))
                while bytes_leidos < content_length:
                    chunk = conn.recv(min(content_length - bytes_leidos, 512))
                    if not chunk:
                        break
                    cuerpo += chunk.decode('utf-8', 'ignore')
                    bytes_leidos += len(chunk)
                request = parts[0] + "\r\n\r\n" + cuerpo

            if "POST /save" in request:
                params = parse_post_data(request)
                ssid_nuevo          = params.get("ssid", "")
                pass_nuevo          = params.get("password", "")
                linking_code_nuevo  = params.get("linking_code", "")
                if ssid_nuevo:
                    import config
                    try:
                        with open(config.CONFIG_FILE, "w") as f:
                            ujson.dump({
                                "SSID": ssid_nuevo,
                                "PASSWORD": pass_nuevo,
                                "LINKING_CODE": linking_code_nuevo
                            }, f)
                        guardado = True
                        print(f"Credenciales guardadas → SSID: {ssid_nuevo}")
                    except Exception as e:
                        print("Error al guardar configuración:", e)
                conn.send('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n')
                conn.send(HTML_SUCCESS)
            else:
                conn.send('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n')
                conn.send(HTML_TEMPLATE)
        except Exception as e:
            print("Error HTTP portal:", e)
        finally:
            try:
                conn.close()
            except Exception:
                pass

    s.close()
    print("Credenciales recibidas. Reiniciando en 3 s...")
    time.sleep(3)
    reset()
