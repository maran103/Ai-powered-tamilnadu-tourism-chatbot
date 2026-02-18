import { useEffect, useState } from "react";
import "./ChatSidebar.css";

function ChatSidebar({ currentChat, onSelectChat, onNewChat, chats = [] }) {
  const [isOpen, setIsOpen] = useState(true);

  // Toggle a class on the main app container so layout can respond when sidebar opens
  useEffect(() => {
    const container = document.querySelector('.app-container');
    if (!container) return;

    if (isOpen) container.classList.add('sidebar-open');
    else container.classList.remove('sidebar-open');

    return () => {
      container.classList.remove('sidebar-open');
    };
  }, [isOpen]);

  const getChatPreview = (messages) => {
    if (!messages || messages.length === 0) return "New Chat";
    
    // Find the first user message
    const firstUserMessage = messages.find(msg => msg.type === "user");
    if (!firstUserMessage) return "New Chat";
    
    // Return first 30 characters of the message
    return firstUserMessage.text.substring(0, 30) + (firstUserMessage.text.length > 30 ? "..." : "");
  };

  const getChatCategory = (messages) => {
    if (!messages || messages.length === 0) return "Recent";
    
    // Extract category from first user message
    const firstUserMessage = messages.find(msg => msg.type === "user");
    if (!firstUserMessage) return "Recent";
    
    const text = firstUserMessage.text.toLowerCase();
    
    if (text.includes("temple") || text.includes("கோயில்")) return "🏛️ Temples";
    if (text.includes("fort") || text.includes("கோட்டை")) return "🏰 Forts";
    if (text.includes("museum") || text.includes("சंग्रहालय")) return "🖼️ Museums";
    if (text.includes("monument") || text.includes("स्मारक")) return "📿 Monuments";
    if (text.includes("beach") || text.includes("கடற்கரை")) return "🏖️ Beaches";
    if (text.includes("route") || text.includes("பாதை")) return "🗺️ Routes";
    if (text.includes("food") || text.includes("சமையல்")) return "🍲 Food";
    if (text.includes("festival") || text.includes("திருவிழா")) return "🎉 Festivals";
    
    return "💬 Chats";
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <button 
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Close Sidebar" : "Open Sidebar"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`chat-sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2>Chat History</h2>
          <button 
            className="new-chat-btn"
            onClick={onNewChat}
            title="Start New Chat"
          >
            New
          </button>
        </div>

        <div className="chats-container">
          {chats && chats.length > 0 ? (
            <>
              {chats.map((chat, index) => (
                <div
                  key={index}
                  className={`chat-item ${currentChat === index ? "active" : ""}`}
                  onClick={() => onSelectChat(index)}
                  title={getChatPreview(chat.messages)}
                >
                  <div className="chat-category">
                    {getChatCategory(chat.messages)}
                  </div>
                  <div className="chat-preview">
                    {getChatPreview(chat.messages)}
                  </div>
                  <div className="chat-time">
                    {chat.timestamp ? new Date(chat.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    }) : ""}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="empty-chat">
              <p>No chats yet</p>
              <p className="hint">Start a new conversation!</p>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="settings-btn" title="Settings">
            Settings
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}
    </>
  );
}

export default ChatSidebar;
