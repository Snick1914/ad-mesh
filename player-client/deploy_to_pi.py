#!/usr/bin/env python3
import os
import pty
import subprocess
import sys
import time

PI_IP = "10.167.36.79"
PI_USER = "pico"
PI_PASS = "190700Edgar"
LOCAL_DIR = "/home/Sistemas/Proyectos/Clientes/Roberto Olmos/ad-mesh/player-client"

def run_with_password(cmd, password):
    print(f"\n🚀 Ejecutando: {cmd}")
    master, slave = pty.openpty()
    
    proc = subprocess.Popen(
        cmd,
        shell=True,
        stdin=slave,
        stdout=slave,
        stderr=slave,
        close_fds=True
    )
    
    os.close(slave)
    
    output_chunks = []
    password_sent = False
    
    while True:
        try:
            # Leer salida en tiempo real
            data = os.read(master, 1024).decode('utf-8', errors='ignore')
            if not data:
                break
            
            output_chunks.append(data)
            sys.stdout.write(data)
            sys.stdout.flush()
            
            # Detectar solicitud de contraseña de SSH/SCP
            if ("password:" in data.lower() or "passphrase" in data.lower()) and not password_sent:
                time.sleep(0.5) # Pequeña espera para asegurar que el prompt está listo
                os.write(master, (password + "\n").encode())
                sys.stdout.write(" [🔑 Contraseña enviada automáticamente]\n")
                sys.stdout.flush()
                password_sent = True
        except OSError:
            break
            
    proc.wait()
    return proc.returncode, "".join(output_chunks)

def main():
    # 1. Cambiar al directorio local del player
    os.chdir(LOCAL_DIR)
    
    # 2. Comprimir los archivos del reproductor para una transferencia veloz
    print("📦 Comprimiendo archivos del reproductor...")
    tar_cmd = "tar -czf player-client.tar.gz docker-compose.yml player-daemon"
    subprocess.run(tar_cmd, shell=True, check=True)
    print("✓ Compresión completada (player-client.tar.gz)")

    try:
        # 3. Subir el archivo .tar.gz a la Raspberry Pi usando SCP
        scp_cmd = f"scp -o StrictHostKeyChecking=no player-client.tar.gz {PI_USER}@{PI_IP}:/home/{PI_USER}/"
        code, _ = run_with_password(scp_cmd, PI_PASS)
        if code != 0:
            print("\n❌ Error al transferir el archivo por SCP.")
            return

        # 4. Descomprimir e iniciar el contenedor Docker en la Pi usando SSH
        remote_cmds = (
            f"mkdir -p /home/{PI_USER}/admesh-player && "
            f"tar -xzf /home/{PI_USER}/player-client.tar.gz -C /home/{PI_USER}/admesh-player && "
            f"rm /home/{PI_USER}/player-client.tar.gz && "
            f"cd /home/{PI_USER}/admesh-player && "
            f"docker compose up -d --build"
        )
        ssh_cmd = f"ssh -o StrictHostKeyChecking=no {PI_USER}@{PI_IP} '{remote_cmds}'"
        code, _ = run_with_password(ssh_cmd, PI_PASS)
        if code != 0:
            print("\n❌ Error ejecutando los comandos remotos en la Pi.")
            return

        print("\n🎉 ¡Despliegue completado con éxito! El reproductor está corriendo en tu Raspberry Pi.")

    finally:
        # 5. Limpieza local del archivo .tar.gz temporal
        if os.path.exists("player-client.tar.gz"):
            os.remove("player-client.tar.gz")
            print("✓ Limpieza del archivo temporal local completada.")

if __name__ == "__main__":
    main()
