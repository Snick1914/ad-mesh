#!/usr/bin/env python3
import os
import pty
import sys
import select
import subprocess
import time

PI_IP = "10.167.36.79"
PI_USER = "pico"
PI_PASS = "190700Edgar"
LOCAL_DIR = "/home/Sistemas/Proyectos/Clientes/Roberto Olmos/ad-mesh/player-client"

def run_in_pty(cmd, password):
    print(f"\n🚀 [PTY] Ejecutando: {cmd}")
    pid, fd = pty.fork()
    if pid == 0:
        # Proceso hijo: ejecutar el comando en un TTY real
        os.execvp('/bin/sh', ['/bin/sh', '-c', cmd])
    else:
        # Proceso padre: interactuar con el TTY
        password_sent = False
        buffer = ""
        
        while True:
            r, w, x = select.select([fd], [], [], 15)
            if not r:
                # Timeout
                break
            try:
                data = os.read(fd, 1024).decode('utf-8', errors='ignore')
            except OSError:
                break
            if not data:
                break
                
            sys.stdout.write(data)
            sys.stdout.flush()
            buffer += data
            
            # Detectar prompt de contraseña
            if ("password:" in buffer.lower() or "passphrase" in buffer.lower()) and not password_sent:
                time.sleep(0.5)
                os.write(fd, (password + "\n").encode())
                sys.stdout.write(" [🔑 Contraseña enviada automáticamente]\n")
                sys.stdout.flush()
                password_sent = True
                buffer = ""
                
        _, status = os.waitpid(pid, 0)
        return status

def main():
    os.chdir(LOCAL_DIR)
    
    print("📦 Comprimiendo archivos del reproductor...")
    tar_cmd = "tar -czf player-client.tar.gz docker-compose.yml player-daemon"
    subprocess.run(tar_cmd, shell=True, check=True)
    print("✓ Compresión completada (player-client.tar.gz)")

    try:
        # Subir el archivo .tar.gz a la Raspberry Pi
        scp_cmd = f"scp -o StrictHostKeyChecking=no player-client.tar.gz {PI_USER}@{PI_IP}:/home/{PI_USER}/"
        status = run_in_pty(scp_cmd, PI_PASS)
        if status != 0:
            print("\n❌ Error al transferir el archivo por SCP.")
            return

        # Descomprimir y levantar contenedores en la Pi
        remote_cmds = (
            f"mkdir -p /home/{PI_USER}/admesh-player && "
            f"tar -xzf /home/{PI_USER}/player-client.tar.gz -C /home/{PI_USER}/admesh-player && "
            f"rm /home/{PI_USER}/player-client.tar.gz && "
            f"cd /home/{PI_USER}/admesh-player && "
            f"docker compose up -d --build"
        )
        ssh_cmd = f"ssh -o StrictHostKeyChecking=no {PI_USER}@{PI_IP} '{remote_cmds}'"
        status = run_in_pty(ssh_cmd, PI_PASS)
        if status != 0:
            print("\n❌ Error ejecutando los comandos remotos en la Pi.")
            return

        print("\n🎉 ¡Despliegue completado con éxito! El reproductor está corriendo en tu Raspberry Pi.")

    finally:
        if os.path.exists("player-client.tar.gz"):
            os.remove("player-client.tar.gz")
            print("✓ Limpieza del archivo temporal local completada.")

if __name__ == "__main__":
    main()
