import os
import ssl
import traceback
from pymongo import MongoClient
import certifi

uri = os.getenv("MONGO_URI")
if not uri:
    print("MONGO_URI not set in environment. Please set it in .env or export it.")
    print("Example SRV URI: mongodb+srv://<user>:<pass>@cluster0.mongodb.net/?retryWrites=true&w=majority")

try:
    print("OpenSSL version:", ssl.OPENSSL_VERSION)
    client = MongoClient(uri, tls=True, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
    # force server selection / handshake
    client.admin.command("ping")
    print("MongoDB connected OK")
except Exception as e:
    print("MongoDB connection failed:")
    traceback.print_exc()
    print("Error repr:", repr(e))
