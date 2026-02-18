import os
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from groq import Groq
from prompt import heritage_prompt
from mongo_database import MongoDatabase
from typing import Optional
import json

# Load environment variables
load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client and MongoDB
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
db = MongoDatabase()


@app.on_event("startup")
def on_startup_connect_db():
    print("\n" + "="*60)
    print("Starting Heritage AI Backend...")
    print("="*60)
    connected = db.connect()
    if not connected:
        print("\n⚠️  WARNING: MongoDB connection failed!")
        print("   - Check MONGO_URI in .env file")
        print("   - Ensure MongoDB cluster is running")
        print("   - Check IP whitelist on Atlas")
        print("   - Verify username/password")
        print("\nSome features will not work until database is connected.")
    print("="*60 + "\n")

# ==================== REQUEST MODELS ====================

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChatRequest(BaseModel):
    message: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: str = "en"  # 'en' (English), 'ta' (Tamil), 'hi' (Hindi)

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/auth/signup")
def signup(req: SignupRequest):
    """User signup endpoint"""
    try:
        if len(req.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        result = db.create_user(
            email=req.email,
            password=req.password,
            name=req.name
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['message'])
        
        return {
            "success": True,
            "message": result['message'],
            "user_id": result['user_id']
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")

@app.post("/auth/login")
def login(req: LoginRequest):
    """User login endpoint"""
    try:
        result = db.login_user(
            email=req.email,
            password=req.password
        )
        
        if not result['success']:
            raise HTTPException(status_code=401, detail=result['message'])
        
        return {
            "success": True,
            "user_id": result['user_id'],
            "name": result['name'],
            "email": result['email'],
            "message": result['message']
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.get("/auth/me")
def get_current_user(user_id: str = Header(None, alias="user-id")):
    """Get current user information"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@app.put("/auth/profile")
def update_profile(req: UpdateProfileRequest, user_id: str = Header(None, alias="user-id")):
    """Update user profile"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = db.update_user_profile(user_id, name=req.name)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result

# ==================== CHAT ENDPOINTS ====================

@app.post("/chat")
def chat(req: ChatRequest, user_id: str = Header(None, alias="user-id")):
    """Send a chat message with streaming response"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Please login to use chat")
    
    # Save user message
    db.save_message(
        user_id=user_id,
        message_type="user",
        content=req.message,
        latitude=req.latitude,
        longitude=req.longitude
    )
    
    location = f"Latitude: {req.latitude}, Longitude: {req.longitude}"
    
    prompt = heritage_prompt(
        user_msg=req.message,
        location=location,
        language=req.language
    )
    
    # Stream the response
    def generate_response():
        full_response = ""
        stream = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=900,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                full_response += text
                # Send as SSE format
                yield f"data: {json.dumps({'text': text})}\n\n"
        
        # Save full AI response after streaming
        db.save_message(
            user_id=user_id,
            message_type="assistant",
            content=full_response
        )
    
    return StreamingResponse(generate_response(), media_type="text/event-stream")

@app.get("/chat/history")
def get_history(user_id: str = Header(None, alias="user-id")):
    """Get chat history for logged-in user"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Please login to view chat history")
    
    messages = db.get_chat_history(user_id)
    message_count = db.get_message_count(user_id)
    
    return {
        "messages": messages,
        "total_count": message_count
    }

@app.delete("/chat/history")
def clear_history(user_id: str = Header(None, alias="user-id")):
    """Clear chat history for logged-in user"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = db.clear_chat_history(user_id)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result

@app.delete("/auth/account")
def delete_account(user_id: str = Header(None, alias="user-id")):
    """Delete user account and all data"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = db.delete_user_account(user_id)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result

# ==================== HEALTH CHECK ====================

@app.get("/")
def root():
    return {
        "status": "Heritage AI backend running with MongoDB",
        "version": "2.0",
        "features": ["user_auth", "chat_history", "location_tracking"]
    }
