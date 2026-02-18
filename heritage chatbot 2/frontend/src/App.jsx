import { useEffect, useState, useRef } from "react";
import { askAI, getChatHistory, clearChatHistory } from "./api";
import Auth from "./Auth";
import ChatSidebar from "./ChatSidebar";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState({});
  const [chats, setChats] = useState([]);
  const [currentChatIndex, setCurrentChatIndex] = useState(0);
  const [language, setLanguage] = useState("en");
  const messagesEndRef = useRef(null);

  // Check if user is already logged in
  useEffect(() => {
    const userId = localStorage.getItem("heritage_user_id");
    const userName = localStorage.getItem("heritage_user_name");
    const userEmail = localStorage.getItem("heritage_user_email");

    if (userId && userName) {
      setUser({
        userId,
        name: userName,
        email: userEmail
      });
    }
  }, []);

  // Load chat history when user logs in
  useEffect(() => {
    if (user) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      });

      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    const history = await getChatHistory();
    
    if (history.length > 0) {
      setMessages(history);
      // Initialize chats array with one chat containing current messages
      setChats([{
        messages: history,
        timestamp: new Date().toISOString(),
        id: Date.now()
      }]);
    } else {
      const welcomeMessage = {
        type: "assistant",
        text: `🙏 வணக்கம் ${user?.name || ""}! Welcome to Tamil Nadu Heritage AI Assistant! I can help you discover amazing heritage sites, temples, and tourist spots. Ask me anything!`,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      setChats([{
        messages: [welcomeMessage],
        timestamp: new Date().toISOString(),
        id: Date.now()
      }]);
    }
    setCurrentChatIndex(0);
  };

  const selectChat = (index) => {
    if (index < chats.length) {
      setCurrentChatIndex(index);
      setMessages(chats[index].messages);
    }
  };

  const createNewChat = () => {
    const welcomeMessage = {
      type: "assistant",
      text: `🙏 வணக்கம் ${user?.name || ""}! How can I help you explore Tamil Nadu's heritage today?`,
      timestamp: new Date().toISOString()
    };
    
    const newChat = {
      messages: [welcomeMessage],
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    setChats(prev => [newChat, ...prev]);
    setCurrentChatIndex(0);
    setMessages([welcomeMessage]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chats.length > 0) {
      const updatedChats = [...chats];
      updatedChats[currentChatIndex] = {
        ...updatedChats[currentChatIndex],
        messages: messages
      };
      setChats(updatedChats);
    }
  }, [messages]);

  const clearChat = async () => {
    const success = await clearChatHistory();
    
    if (success) {
      setMessages([{
        type: "assistant",
        text: `🙏 வணக்கம் ${user?.name || ""}! Welcome to Tamil Nadu Heritage AI Assistant! I can help you discover amazing heritage sites, temples, and tourist spots. Ask me anything!`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const logout = () => {
    localStorage.removeItem("heritage_user_id");
    localStorage.removeItem("heritage_user_name");
    localStorage.removeItem("heritage_user_email");
    setUser(null);
    setMessages([]);
  };

  const ask = async () => {
    if (!query.trim()) return;

    const userMessage = { 
      type: "user", 
      text: query,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    try {
      // Create empty assistant message with unique ID
      const assistantMessageId = Date.now() + 1;
      const assistantMessage = { 
        type: "assistant", 
        text: "",
        timestamp: new Date().toISOString(),
        id: assistantMessageId
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      const messageBody = userMessage.text; // Store query before it changes

      // Stream response
      const response = await askAI({
        message: messageBody,
        latitude: location.latitude,
        longitude: location.longitude,
        language: language
      }, (chunk) => {
        // Update the specific assistant message by ID
        setMessages(prev => {
          return prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, text: msg.text + chunk }
              : msg
          );
        });
      });

      // Speak the full response
      speak(response);
    } catch (error) {
      const errorMessage = { 
        type: "assistant", 
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
        id: Date.now() + 2
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0B80-\u0BFF]/.test(text) ? "ta-IN" : "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  const startVoice = () => {
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "ta-IN";
    recognition.onresult = (e) => {
      setQuery(e.results[0][0].transcript);
    };
    recognition.start();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  // Show login page if not authenticated
  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <div className="app-container">
      {/* Chat Sidebar */}
      <ChatSidebar 
        currentChat={currentChatIndex}
        onSelectChat={selectChat}
        onNewChat={createNewChat}
        chats={chats}
      />

      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <h1>Tamil Nadu Heritage AI</h1>
            <p>Welcome, {user.name}!</p>
          </div>
          <div className="header-actions">
            <select 
              className="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              title="Select Language"
            >
              <option value="en">English</option>
              <option value="ta">Tamil</option>
              <option value="hi">Hindi</option>
            </select>
            <button className="clear-button" onClick={clearChat} title="Clear Chat">
              Clear
            </button>
            <button className="logout-button" onClick={logout} title="Logout">
              Logout
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="messages-container">
          {messages.map((msg, index) => (
            <div key={msg.id || index} className={`message ${msg.type}`}>
              <div className="message-avatar">
                {msg.type === "user" ? "U" : "AI"}
              </div>
              <div className="message-content">
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: linkifyMessage(msg.text) }}
                />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant">
              <div className="message-avatar">AI</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              className="input-field"
              placeholder="Ask about heritage sites, temples, tourist places..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              rows="1"
            />
            <div className="button-group">
              <button 
                className="voice-button" 
                onClick={startVoice}
                title="Voice Input"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </button>
              <button 
                className="send-button" 
                onClick={ask}
                disabled={!query.trim() || isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

// ------------------ Helper: Linkify messages ------------------
function linkifyMessage(text) {
  if (!text) return "";

  // Escape HTML
  const escapeHtml = (s) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  let escaped = escapeHtml(text);

  // Convert coord patterns like 'Latitude: x, Longitude: y' to Google Maps links
  const coordRegex = /Latitude:\s*([-+]?\d*\.?\d+)[,\s]+Longitude:\s*([-+]?\d*\.?\d+)/i;
  escaped = escaped.replace(coordRegex, (m, lat, lon) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    return `Latitude: ${lat}, Longitude: ${lon} (<a href="${url}" target="_blank" rel="noopener noreferrer">view on map</a>)`;
  });

  // Linkify http/https URLs
  const urlRegex = /((https?:\/\/)[^\s<]+)/g;
  escaped = escaped.replace(urlRegex, (m) => {
    return `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`;
  });

  // Linkify 'www.' without protocol
  const wwwRegex = /(^|\s)(www\.[^\s<]+)/g;
  escaped = escaped.replace(wwwRegex, (m, pre, url) => {
    const href = `https://${url}`;
    return `${pre}<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  // Preserve newlines
  escaped = escaped.replace(/\n/g, "<br />");

  return escaped;
}
