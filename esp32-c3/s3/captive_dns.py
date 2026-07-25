import socket


class SimpleDNSServer:
    """
    Servidor DNS Cautivo UDP no bloqueante en puerto 53.
    Responde a TODAS las consultas tipo A (IPv4) con la IP del propio ESP32,
    forzando a los sistemas operativos (Android/iOS/Windows) a detectar el
    portal cautivo y mostrar el aviso de "iniciar sesión en la red".

    Sin este servidor, el teléfono solo puede llegar al ESP32 escribiendo
    la IP manualmente -- nunca se dispara la detección automática de portal.
    """

    def __init__(self, ip="192.168.4.1"):
        self.ip_bytes = bytes(map(int, ip.split('.')))
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.settimeout(0.01)  # No bloqueante, revisa rápido en cada ciclo
        self._activo = False
        try:
            self.sock.bind(('0.0.0.0', 53))
            self._activo = True
        except Exception as e:
            print("[DNS WARN] No se pudo vincular puerto 53:", e)

    def process(self):
        """Procesa todas las peticiones DNS acumuladas en el buffer UDP (llamar en cada ciclo del bucle principal)."""
        if not self._activo:
            return
        while True:
            try:
                data, addr = self.sock.recvfrom(512)
                if len(data) < 12:
                    continue

                tid = data[:2]  # Transaction ID

                # Recorrer sección Question para hallar el final del dominio consultado
                idx = 12
                while idx < len(data) and data[idx] != 0:
                    idx += 1 + data[idx]

                if idx >= len(data) - 4:
                    continue

                idx += 1  # Saltar byte nulo final 0x00
                qtype = data[idx:idx + 2]
                question = data[12:idx + 4]

                if qtype == b'\x00\x01':  # Tipo A (IPv4) -> responder con la IP del ESP32
                    flags = b'\x81\x80'
                    counts = b'\x00\x01\x00\x01\x00\x00\x00\x00'  # 1 Question, 1 Answer
                    answer = b'\xc0\x0c\x00\x01\x00\x01\x00\x00\x00\x3c\x00\x04' + self.ip_bytes
                    response = tid + flags + counts + question + answer
                else:  # Tipo AAAA (IPv6) u otros -> NOERROR sin respuesta
                    flags = b'\x81\x80'
                    counts = b'\x00\x01\x00\x00\x00\x00\x00\x00'
                    response = tid + flags + counts + question

                self.sock.sendto(response, addr)
            except Exception:
                break  # Buffer UDP vacío o error puntual; salir del bucle de vaciado

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass
