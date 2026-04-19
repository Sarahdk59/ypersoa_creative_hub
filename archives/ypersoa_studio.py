import http.server
import socketserver
import urllib.request
import urllib.error
import sys

# Ypersoa Content Studio Proxy (2026)
# Fix for CORS issues with Video Generation API

PORT = 3001

class YpersoaProxy(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-goog-api-key')
        self.end_headers()

    def do_POST(self):
        if ":predict" in self.path or ":predictLongRunning" in self.path or ":generate_videos" in self.path:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Forward to Google
            url = "https://generativelanguage.googleapis.com" + self.path
            req = urllib.request.Request(url, data=post_data, headers={'Content-Type': 'application/json'})
            
            try:
                with urllib.request.urlopen(req) as response:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(response.read())
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            super().do_POST()

    def do_GET(self):
        if "/operations/" in self.path or "/v1beta/files/" in self.path:
            # Forward to Google (Operations or File Downloads)
            url = "https://generativelanguage.googleapis.com" + self.path
            try:
                with urllib.request.urlopen(url) as response:
                    self.send_response(200)
                    self.send_header('Content-Type', response.info().get_content_type())
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(response.read())
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            super().do_GET()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

handler = YpersoaProxy
# Allow port reuse to avoid "Address already in use"
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"\n🚀 Ypersoa Studio Relay (2026) actif sur le port {PORT}")
    print(f"👉 Ouvrez : http://localhost:{PORT}/ypersoa_content_os_v3.html")
    print("\nLaissez cette fenêtre ouverte pour utiliser la génération vidéo.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur...")
        sys.exit(0)
