from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

class MongoDatabase:
    def __init__(self):
        # Defer actual connection until app startup to avoid crashing on import
        self.client = None
        self.db = None
        self.users = None
        self.messages = None
        self._connected = False

    def _ensure_connected(self):
        """Check connection status and raise helpful error if not connected."""
        if not self._connected or self.users is None:
            raise RuntimeError(
                "Database not connected. Check MongoDB URI in .env and ensure cluster is running. "
                "Error details available in server logs."
            )

    def connect(self):
        """Establish MongoDB connection and create indexes.

        Returns True on success, False on failure.
        """
        import certifi

        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
        try:
            # Force TLS and provide CA bundle from certifi for reliable SSL handshake
            self.client = MongoClient(mongo_uri, tls=True, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
            self.db = self.client['heritage_chatbot']

            # Collections
            self.users = self.db['users']
            self.messages = self.db['messages']

            # Create indexes (may raise if server unreachable)
            self.users.create_index("email", unique=True)
            self.messages.create_index([("user_id", 1), ("timestamp", -1)])
            self._connected = True
            print("✓ MongoDB connected successfully")
            return True
        except Exception as e:
            print(f"✗ MongoDB connection failed: {e}")
            self.client = None
            self.db = None
            self.users = None
            self.messages = None
            self._connected = False
            return False
    
    # ==================== USER AUTHENTICATION ====================
    
    def create_user(self, email, password, name):
        """Create a new user account"""
        self._ensure_connected()
        try:
            # Hash password
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            user_data = {
                "email": email.lower(),
                "password": hashed_password,
                "name": name,
                "created_at": datetime.utcnow(),
                "last_login": None
            }
            
            result = self.users.insert_one(user_data)
            return {
                "success": True,
                "user_id": str(result.inserted_id),
                "message": "User created successfully"
            }
        except Exception as e:
            if "duplicate key error" in str(e):
                return {
                    "success": False,
                    "message": "Email already exists"
                }
            return {
                "success": False,
                "message": str(e)
            }
    
    def login_user(self, email, password):
        """Authenticate user login"""
        self._ensure_connected()
        try:
            user = self.users.find_one({"email": email.lower()})
            
            if not user:
                return {
                    "success": False,
                    "message": "Invalid email or password"
                }
            
            # Verify password
            if bcrypt.checkpw(password.encode('utf-8'), user['password']):
                # Update last login
                self.users.update_one(
                    {"_id": user['_id']},
                    {"$set": {"last_login": datetime.utcnow()}}
                )
                
                return {
                    "success": True,
                    "user_id": str(user['_id']),
                    "name": user['name'],
                    "email": user['email'],
                    "message": "Login successful"
                }
            else:
                return {
                    "success": False,
                    "message": "Invalid email or password"
                }
        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }
    
    def get_user_by_id(self, user_id):
        """Get user information by ID"""
        try:
            user = self.users.find_one({"_id": ObjectId(user_id)})
            if user:
                return {
                    "user_id": str(user['_id']),
                    "name": user['name'],
                    "email": user['email'],
                    "created_at": user['created_at']
                }
            return None
        except:
            return None
    
    # ==================== CHAT MESSAGES ====================
    
    def save_message(self, user_id, message_type, content, latitude=None, longitude=None):
        """Save a chat message"""
        try:
            message_data = {
                "user_id": user_id,
                "message_type": message_type,
                "content": content,
                "latitude": latitude,
                "longitude": longitude,
                "timestamp": datetime.utcnow()
            }
            
            result = self.messages.insert_one(message_data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error saving message: {e}")
            return None
    
    def get_chat_history(self, user_id, limit=100):
        """Get chat history for a specific user"""
        try:
            messages = self.messages.find(
                {"user_id": user_id}
            ).sort("timestamp", 1).limit(limit)
            
            chat_history = []
            for msg in messages:
                chat_history.append({
                    "id": str(msg['_id']),
                    "type": msg['message_type'],
                    "text": msg['content'],
                    "timestamp": msg['timestamp'].isoformat(),
                    "latitude": msg.get('latitude'),
                    "longitude": msg.get('longitude')
                })
            
            return chat_history
        except Exception as e:
            print(f"Error retrieving chat history: {e}")
            return []
    
    def clear_chat_history(self, user_id):
        """Clear all chat history for a user"""
        try:
            result = self.messages.delete_many({"user_id": user_id})
            return {
                "success": True,
                "deleted_count": result.deleted_count
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }
    
    def get_message_count(self, user_id):
        """Get total message count for a user"""
        return self.messages.count_documents({"user_id": user_id})
    
    # ==================== USER MANAGEMENT ====================
    
    def update_user_profile(self, user_id, name=None):
        """Update user profile"""
        try:
            update_data = {}
            if name:
                update_data["name"] = name
            
            if update_data:
                self.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": update_data}
                )
                return {"success": True, "message": "Profile updated"}
            return {"success": False, "message": "No data to update"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def delete_user_account(self, user_id):
        """Delete user account and all their data"""
        try:
            # Delete all messages
            self.messages.delete_many({"user_id": user_id})
            
            # Delete user
            self.users.delete_one({"_id": ObjectId(user_id)})
            
            return {"success": True, "message": "Account deleted"}
        except Exception as e:
            return {"success": False, "message": str(e)}
