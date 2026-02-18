import os
import ssl
import socket
from dotenv import load_dotenv

load_dotenv()

# Extract host from MONGO_URI
uri = os.getenv("MONGO_URI", "")
if "mongodb+srv://" in uri:
    # Extract hostname from SRV URI
    start = uri.find("@") + 1
    end = uri.find("/?")
    if end == -1:
        end = uri.find(":", start)
    host = uri[start:end]
    print(f"Extracted host: {host}")
    
    # Try basic socket connection
    print("\nAttempting TLS handshake...")
    try:
        context = ssl.create_default_context()
        with socket.create_connection((host, 27017), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                print(f"✓ TLS handshake successful!")
                print(f"  Cipher: {ssock.cipher()}")
                print(f"  Protocol: {ssock.version()}")
    except Exception as e:
        print(f"✗ TLS handshake failed: {e}")
        print("\nTry these fixes:")
        print("1. Open Atlas → Security → IP Access List")
        print("2. Add 0.0.0.0/0 (or your IP) to whitelist")
        print("3. Go to Network Access → Database Users")
        print("4. Verify username/password is correct")
        print("5. Check cluster status is 'Running'")
else:
    print("MONGO_URI not set or invalid format")
