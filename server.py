import http.server
import socketserver
import os
import sys
import time

PORT = 8000

class ChessHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def guess_type(self, path):
        # Add proper MIME types for JavaScript files
        if path.endswith('.js'):
            return 'application/javascript'
        return super().guess_type(path)
    
    def log_message(self, format, *args):
        """Log messages with timestamps and flush immediately for real-time logging"""
        sys.stdout.write("%s - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format % args))
        sys.stdout.flush()
    
    def do_GET(self):
        """Handle GET requests with better error reporting"""
        try:
            # Print request details
            print(f"Handling request for: {self.path}")
            
            # Normalize path
            if self.path == '/':
                self.path = '/index.html'
            
            # Call the parent class method to handle the request
            return super().do_GET()
        except Exception as e:
            print(f"Error handling request: {e}")
            self.send_error(500, f"Server error: {str(e)}")

def run_server():
    try:
        # Change to the directory containing the server script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(script_dir)
        print(f"Server root directory: {script_dir}")
        
        # List files in the directory to verify content
        print("\nFiles available in server directory:")
        for root, dirs, files in os.walk(".", topdown=True):
            for file in files:
                print(f"  {os.path.join(root, file)}")
        
        # Create server with specific address to avoid potential conflicts
        server_address = ('localhost', PORT)
        httpd = socketserver.TCPServer(server_address, ChessHTTPRequestHandler)
        
        print(f"\nServer running at http://localhost:{PORT}/")
        print(f"Chess application available at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop the server")
        
        # Flush stdout to ensure messages are displayed immediately
        sys.stdout.flush()
        
        # Start the server
        httpd.serve_forever()
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_server()
