import socket

def websocket_handshake(sock, host, path="/mqtt"):
    key = "dGhlIHNhbXBsZSBub25jZQ=="
    
    handshake = (
        "GET %s HTTP/1.1\r\n"
        "Host: %s\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Key: %s\r\n"
        "Sec-WebSocket-Version: 13\r\n"
        "\r\n"
    ) % (path, host, key)
    
    data = handshake.encode('utf-8')
    print("DEBUG websocket_handshake writing data:", len(data), "bytes")
    try:
        sock.write(data)
        print("DEBUG sock.write success!")
    except Exception as e:
        print("DEBUG sock.write failed:", e)
        try:
            print("DEBUG trying sock.send instead")
            sock.send(data)
            print("DEBUG sock.send success!")
        except Exception as e2:
            print("DEBUG sock.send also failed:", e2)
            raise e2
    
    # Leer encabezados de respuesta hasta \r\n\r\n
    response = b""
    while b"\r\n\r\n" not in response:
        try:
            chunk = sock.read(1)
        except TypeError as te:
            print("DEBUG sock.read(1) failed with TypeError, trying recv(1):", te)
            chunk = sock.recv(1)
        if not chunk:
            raise OSError("Handshake falló: Conexión cerrada")
        response += chunk
        
    if b"101 Switching Protocols" not in response:
        raise OSError("Handshake falló: " + response.decode('utf-8', 'ignore'))

class WebSocketClientSocket:
    def __init__(self, sock, host, path="/mqtt"):
        self.sock = sock
        self.buffer = bytearray()
        websocket_handshake(sock, host, path)
        
    def write(self, data):
        mask_key = b"\x12\x34\x56\x78"
        length = len(data)
        header = bytearray([0x82]) # FIN=1, Opcode=2 (Binary)
        
        if length < 126:
            header.append(0x80 | length)
        elif length <= 65535:
            header.append(0x80 | 126)
            header.append((length >> 8) & 0xFF)
            header.append(length & 0xFF)
        else:
            header.append(0x80 | 127)
            for i in range(7, -1, -1):
                header.append((length >> (8 * i)) & 0xFF)
                
        header.extend(mask_key)
        
        masked_data = bytearray(length)
        for i in range(length):
            masked_data[i] = data[i] ^ mask_key[i % 4]
            
        self.sock.write(header + masked_data)
        return length
        
    def send(self, data):
        return self.write(data)
        
    def read(self, size):
        while len(self.buffer) < size:
            self._read_frame()
        
        res = bytes(self.buffer[:size])
        del self.buffer[:size]
        return res
        
    def recv(self, size):
        return self.read(size)
        
    def _read_frame(self):
        h1 = self.sock.read(1)
        if not h1:
            raise OSError("Socket cerrado")
        fin_opcode = h1[0]
        opcode = fin_opcode & 0x0F
        
        h2 = self.sock.read(1)
        if not h2:
            raise OSError("Socket cerrado")
        mask_payload = h2[0]
        has_mask = (mask_payload & 0x80) != 0
        payload_len = mask_payload & 0x7F
        
        if payload_len == 126:
            len_bytes = self.sock.read(2)
            payload_len = (len_bytes[0] << 8) | len_bytes[1]
        elif payload_len == 127:
            len_bytes = self.sock.read(8)
            payload_len = 0
            for b in len_bytes:
                payload_len = (payload_len << 8) | b
                
        if has_mask:
            mask_key = self.sock.read(4)
            
        payload = bytearray(payload_len)
        view = memoryview(payload)
        bytes_read = 0
        while bytes_read < payload_len:
            n = self.sock.readinto(view[bytes_read:])
            if n == 0:
                raise OSError("Socket cerrado leyendo payload")
            bytes_read += n
            
        if has_mask:
            for i in range(payload_len):
                payload[i] ^= mask_key[i % 4]
                
        if opcode == 0x8: # Close
            self.sock.close()
            raise OSError("WebSocket cerrado por el servidor")
        elif opcode == 0x9: # Ping
            mask_key = b"\x12\x34\x56\x78"
            pong_header = bytearray([0x8A, 0x80 | len(payload)])
            pong_header.extend(mask_key)
            pong_payload = bytearray(len(payload))
            for i in range(len(payload)):
                pong_payload[i] = payload[i] ^ mask_key[i % 4]
            self.sock.write(pong_header + pong_payload)
        elif opcode in (0x1, 0x2, 0x0):
            self.buffer.extend(payload)

    def close(self):
        try:
            mask_key = b"\x12\x34\x56\x78"
            close_frame = bytearray([0x88, 0x80])
            close_frame.extend(mask_key)
            self.sock.write(close_frame)
        except Exception:
            pass
        self.sock.close()
