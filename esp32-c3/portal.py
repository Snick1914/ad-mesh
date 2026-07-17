import socket
import ujson
import time
from machine import reset
import button_handler

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
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
            -webkit-backdrop-filter: blur(10px);
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
        .form-group {
            margin-bottom: 1.5rem;
        }
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
        button:hover {
            background: var(--accent-hover);
        }
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
            <button type="submit">Guardar y Conectar</button>
        </form>
        <div class="footer">ESP32-C3 Telemetry Node</div>
    </div>
</body>
</html>
"""

HTML_SUCCESS = """<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuración Guardada</title>
    <style>
        body {
            background-color: #0b0f19;
            color: #f3f4f6;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 2.5rem;
            text-align: center;
            max-width: 400px;
        }
        h2 { color: #10b981; }
        p { color: #9ca3af; line-height: 1.5; }
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

def parse_post_data(request_str):
    """Parsea los datos POST URL-encoded simplificados."""
    try:
        parts = request_str.split("\r\n\r\n")
        if len(parts) < 2:
            return {}
        body = parts[1]
        params = {}
        for pair in body.split("&"):
            if "=" in pair:
                k, v = pair.split("=")
                v = v.replace("+", " ")
                v = v.replace("%21", "!").replace("%40", "@").replace("%23", "#").replace("%24", "$").replace("%25", "%")
                v = v.replace("%5E", "^").replace("%26", "&").replace("%2A", "*").replace("%28", "(").replace("%29", ")")
                v = v.replace("%2F", "/")
                params[k] = v
        return params
    except Exception:
        return {}

def iniciar_servidor_configuracion(wdt=None):
    """Inicia el servidor web en el puerto 80 para configurar las credenciales."""
    addr = socket.getaddrinfo('0.0.0.0', 80)[0][-1]
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(addr)
    s.listen(1)
    print("Servidor de configuración iniciado en http://192.168.4.1")

    guardado = False
    ssid_nuevo = ""
    pass_nuevo = ""

    while not guardado:
        # Chequear el botón físico también en el bucle del portal
        button_handler.chequear_boton(wdt)

        if wdt:
            wdt.feed()
            
        try:
            s.settimeout(1.0)
            conn, addr_client = s.accept()
        except OSError:
            continue

        if wdt:
            wdt.feed()
        
        try:
            conn.settimeout(2.0)
            request = conn.recv(1024).decode('utf-8')
            if not request:
                conn.close()
                continue
                
            # Determinar ruta y responder de forma protegida contra excepciones del socket
            if "POST /save" in request:
                params = parse_post_data(request)
                ssid_nuevo = params.get("ssid", "")
                pass_nuevo = params.get("password", "")
                
                if ssid_nuevo:
                    import config
                    try:
                        with open(config.CONFIG_FILE, "w") as f:
                            ujson.dump({"SSID": ssid_nuevo, "PASSWORD": pass_nuevo}, f)
                        guardado = True
                    except Exception as e:
                        print("Error al guardar wifi_config.json:", e)
                
                conn.send('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n')
                conn.send(HTML_SUCCESS)
            else:
                conn.send('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n')
                conn.send(HTML_TEMPLATE)
        except Exception as e:
            print("Error procesando petición HTTP de configuración:", e)
        finally:
            try:
                conn.close()
            except Exception:
                pass

    s.close()
    print("Credenciales recibidas. Reiniciando el dispositivo en 3 segundos...")
    time.sleep(3)
    reset()
