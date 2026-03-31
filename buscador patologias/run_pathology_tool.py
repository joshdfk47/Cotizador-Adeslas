import http.server
import json
import os
import sys
import webbrowser
import threading
import socketserver
import re

# Configuración
PORT = 8000
PATH_JSON = "pathologies.json"
PATH_JS = "pathologies_db.js"
HTML_FILE = "buscador_patologias_base_interna_v2.html"

# Base Data (Fallback si no existen los archivos)
DEFAULT_PATHOLOGIES = {
    "ADESLAS": [
        {"patologia": "Ejemplo: Gripe", "contratable": "ACEPTADO", "comentario": ""},
    ]
}

def get_base_data_from_html():
    """Intenta extraer los datos base del HTML si existen."""
    try:
        if os.path.exists(HTML_FILE):
            with open(HTML_FILE, "r", encoding="utf-8") as f:
                content = f.read()
            # Buscamos PATHOLOGIES_BASE en el JS o el archivo externo
            if os.path.exists(PATH_JS):
                with open(PATH_JS, "r", encoding="utf-8") as f:
                    js_content = f.read()
                m = re.search(r'const\s+PATHOLOGIES_BASE\s*=\s*(\{.*?\});', js_content, re.DOTALL)
                if m:
                    return json.loads(m.group(1))
    except Exception as e:
        print(f"Aviso: No se pudo extraer datos del HTML/JS ({e})")
    return DEFAULT_PATHOLOGIES

def ensure_files_exist():
    """Crea los archivos iniciales si no existen."""
    if not os.path.exists(PATH_JSON) or not os.path.exists(PATH_JS):
        print("Iniciando archivos de base de datos por primera vez...")
        data = get_base_data_from_html()
        
        if not os.path.exists(PATH_JSON):
            with open(PATH_JSON, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Creado: {PATH_JSON}")
            
        if not os.path.exists(PATH_JS):
            with open(PATH_JS, "w", encoding="utf-8") as f:
                f.write(f"const PATHOLOGIES_BASE = {json.dumps(data, indent=2, ensure_ascii=False)};\n")
            print(f"Creado: {PATH_JS}")

class SyncHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/sync':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data)
                
                print(f"[{self.date_time_string()}] Recibida señal de sincronización...")

                # 1. Actualizar pathologies.json
                with open(PATH_JSON, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f" -> {PATH_JSON} actualizado.")
                
                # 2. Actualizar pathologies_db.js (opcional, para compatibilidad)
                with open(PATH_JS, "w", encoding="utf-8") as f:
                    f.write(f"const PATHOLOGIES_BASE = {json.dumps(data, indent=2, ensure_ascii=False)};\n")
                print(f" -> {PATH_JS} actualizado.")

                # 3. CRÍTICO: Actualizar el Bloque Hardcode dentro del HTML
                if os.path.exists(HTML_FILE):
                    with open(HTML_FILE, "r", encoding="utf-8") as f:
                        html_content = f.read()
                    
                    # Buscamos el bloque de PATHOLOGIES_BASE
                    data_str = json.dumps(data, indent=2, ensure_ascii=False)
                    pattern = r'(const\s+PATHOLOGIES_BASE\s*=\s*)\{.*?\};'
                    new_html = re.sub(pattern, f'\\1{data_str};', html_content, flags=re.DOTALL)
                    
                    if new_html != html_content:
                        with open(HTML_FILE, "w", encoding="utf-8") as f:
                            f.write(new_html)
                        print(f" -> {HTML_FILE} (Hardcode) actualizado automáticamente.")
                    else:
                        print(f" -> {HTML_FILE} ya estaba actualizado.")

                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok"}).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(str(e).encode())
                print(f"Error sincronizando: {e}")
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

def start_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    ensure_files_exist()
    
    # Intentar encontrar un puerto libre si el 8000 está ocupado
    port = PORT
    while True:
        try:
            httpd = socketserver.TCPServer(("", port), SyncHandler)
            break
        except OSError:
            port += 1
            
    print("="*60)
    print(f" HERRAMIENTA DE PATOLOGÍAS ADESLAS - MODO AUTOMÁTICO")
    print("="*60)
    print(f" Servidor ejecutándose en: http://localhost:{port}")
    print(f" Archivos vinculados: {PATH_JSON} y {PATH_JS}")
    print("-" * 60)
    print(" NO CIERRES ESTA VENTANA.")
    print(" Los cambios se guardarán automáticamente mientras la herramienta esté abierta.")
    print("-" * 60)
    
    # Abrir navegador automáticamente
    webbrowser.open(f"http://localhost:{port}/{HTML_FILE}")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nCerrando herramienta...")
        sys.exit(0)

if __name__ == "__main__":
    start_server()
