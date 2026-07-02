import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import { ChatThread, ChatMessage, User } from '../types';

interface ChatPageProps {
  onBack: () => void;
  initialLabId?: string;
  initialPatientId?: string;
}

const POLL_INTERVAL = 3000; // Poll messages every 3 seconds

export const ChatPage: React.FC<ChatPageProps> = ({ onBack, initialLabId, initialPatientId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadName, setActiveThreadName] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [menuOpenMessageId, setMenuOpenMessageId] = useState<number | null>(null);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<number | null>(null);
  const userRef = useRef<User | null>(null);
  const prevMessageCountRef = useRef<number>(0);
  const userSentRef = useRef<boolean>(false);

  // 1. Fetch user on mount
  useEffect(() => {
    const medbookUser = sessionStorage.getItem('medbook_user');
    if (medbookUser) {
       try {
         const parsed = JSON.parse(medbookUser);
         setUser(parsed);
         userRef.current = parsed;
       } catch (e) {
         console.error('Failed to parse user profile:', e);
       }
    }
  }, []);

  // 2. Fetch threads and handle initial chat targets
  const fetchThreads = async () => {
    try {
      const data = await api.getChatThreads();
      setThreads(data);

      // If we have an active thread, refresh its name in case it changed
      if (activeThreadId) {
        const active = data.find(t => t.id === activeThreadId);
        if (active) {
          setActiveThreadName(active.name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      setLoading(true);
      await fetchThreads();

      // Check if we were redirected with a specific chat target
      if (user.role === 'patient' && initialLabId) {
        setActiveThreadId(initialLabId);
        // Find lab name in threads or fetch it from list
        try {
          const threadsData = await api.getChatThreads();
          const found = threadsData.find(t => t.id === initialLabId);
          if (found) {
            setActiveThreadName(found.name);
          } else {
            // New chat thread: fetch lab list to resolve name
            const labs = await api.getLabsList();
            const lab = labs.find((l: any) => l.id === initialLabId);
            if (lab) {
              setActiveThreadName(lab.name);
              // Optimistically add an empty thread to the top of list
              setThreads(prev => [
                {
                  id: initialLabId,
                  name: lab.name,
                  last_message: 'Start of conversation',
                  unread_count: 0
                },
                ...prev
              ]);
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else if (user.role === 'lab_admin' && initialPatientId) {
        setActiveThreadId(initialPatientId);
        try {
          const threadsData = await api.getChatThreads();
          const found = threadsData.find(t => t.id === initialPatientId);
          if (found) {
            setActiveThreadName(found.name);
          } else {
            setActiveThreadName('Patient');
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initialLabId, initialPatientId]);

  // 3. Fetch messages for active thread + mark as read
  const fetchMessages = async (showLoading = false) => {
    const currentUser = userRef.current;
    if (!activeThreadId || !currentUser) return;

    if (showLoading) setLoadingMessages(true);
    try {
      const params = currentUser.role === 'patient' 
        ? { lab_id: activeThreadId } 
        : { patient_id: activeThreadId };
        
      const data = await api.getChatMessages(params);
      
      // Only update state if message count changes or message statuses change to prevent excessive re-renders
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  };

  // 4. Smart scroll: only auto-scroll when user sent a message or is already near bottom
  const scrollToBottom = (force = false) => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 120;

    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const newCount = messages.length;
    const oldCount = prevMessageCountRef.current;
    prevMessageCountRef.current = newCount;

    if (newCount === 0) return;

    // Always scroll if user just sent a message
    if (userSentRef.current) {
      userSentRef.current = false;
      setTimeout(() => scrollToBottom(true), 50);
      return;
    }

    // Scroll on initial load or new thread
    if (oldCount === 0 && newCount > 0) {
      setTimeout(() => scrollToBottom(true), 50);
      return;
    }

    // On new incoming messages, only scroll if already near bottom
    if (newCount > oldCount) {
      scrollToBottom(false);
    }
  }, [messages]);

  // 5. Active thread changed: fetch messages & setup polling
  useEffect(() => {
    if (!activeThreadId) return;

    // Clear existing polling
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
    }

    // Fetch messages immediately
    fetchMessages(true);

    // Setup polling every POLL_INTERVAL ms
    pollingRef.current = window.setInterval(() => {
      fetchMessages(false);
      fetchThreads(); // Also refresh threads for unread counts & snippets
    }, POLL_INTERVAL);

    // Mark local threads count as read optimistically
    setThreads(prev => 
      prev.map(t => t.id === activeThreadId ? { ...t, unread_count: 0 } : t)
    );

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId]);

  // 6. Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = userRef.current;
    if (!newMessage.trim() || !activeThreadId || !currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input optimistically

    try {
      const payload = currentUser.role === 'patient'
        ? { lab_id: activeThreadId, message_text: messageText }
        : { patient_id: activeThreadId, message_text: messageText };

      const response = await api.sendChatMessage(payload);
      
      // Optimistically append message and flag for auto-scroll
      userSentRef.current = true;
      setMessages(prev => [...prev, response]);
      
      // Update thread list snippet
      setThreads(prev => 
        prev.map(t => t.id === activeThreadId 
          ? { ...t, last_message: messageText, last_message_time: new Date().toISOString() } 
          : t
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleUpdateMessage = async (messageId: number) => {
    if (!editingText.trim()) return;
    try {
      const response = await api.editChatMessage(messageId, editingText.trim());
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, message_text: response.message_text, edited_at: response.edited_at } : m));
      setEditingMessageId(null);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await api.deleteChatMessage(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, message_text: '' } : m));
      setShowDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Filter threads based on search input
  const filteredThreads = threads.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time utility (Telegram-style relative time)
  const formatChatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-[calc(100dvh-140px)] flex flex-col md:flex-row md:rounded-2xl md:bento-panel-light overflow-hidden shadow-none md:shadow-sm">
      {/* Sidebar - Threads list */}
      <aside className={`w-full md:w-80 border-r border-brand-border flex flex-col h-full bg-brand-cream/60 ${activeThreadId ? 'hidden md:flex' : 'flex'}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-brand-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="flex items-center gap-1.5 text-brand-muted-text hover:text-brand-dark-text transition-colors text-xs font-bold cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="text-xs font-extrabold text-brand-terracotta uppercase tracking-wider">
              Telegram Direct
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/40 border border-brand-border rounded-xl py-2 px-3 pl-9 focus:outline-none focus:border-brand-terracotta transition-all text-xs"
            />
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-brand-muted-text/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Threads List Scrollable */}
        <div className="flex-grow overflow-y-auto divide-y divide-brand-border/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2">
              <div className="w-6 h-6 border-2 border-brand-border border-t-brand-terracotta rounded-full animate-spin"></div>
              <span className="text-[10px] text-brand-muted-text">Connecting messaging...</span>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-brand-muted-text text-xs">
              No direct chats active. Click "Chat with Lab" on tests or historical bookings to start a thread.
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isActive = thread.id === activeThreadId;
              const initials = thread.name ? thread.name.slice(0, 2).toUpperCase() : 'CH';
              return (
                <button
                  key={thread.id}
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    setActiveThreadName(thread.name);
                  }}
                  className={`w-full p-3.5 flex items-start gap-3 transition-colors text-left focus:outline-none cursor-pointer ${
                    isActive ? 'bg-brand-sage/60 border-l-4 border-l-brand-forest' : 'hover:bg-brand-sage/20'
                  }`}
                >
                  {/* Avatar bubble */}
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-black select-none ${
                    isActive ? 'bg-brand-forest text-brand-cream' : 'bg-brand-sage text-brand-forest'
                  }`}>
                    {initials}
                  </div>
                  
                  {/* Thread details snippet */}
                  <div className="flex-grow overflow-hidden space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-brand-dark-text truncate max-w-[120px]">{thread.name}</h4>
                      <span className="text-[9px] text-brand-muted-text font-semibold">{formatChatTime(thread.last_message_time)}</span>
                    </div>
                    <p className="text-[11px] text-brand-muted-text/80 truncate pr-4">{thread.last_message}</p>
                  </div>

                  {/* Unread count badge */}
                  {thread.unread_count > 0 && (
                    <span className="shrink-0 inline-flex items-center justify-center bg-brand-terracotta text-brand-light-text font-bold rounded-full w-4.5 h-4.5 text-[9px] scale-90 select-none">
                      {thread.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Conversation area */}
      <main className={`flex-grow flex flex-col h-full bg-brand-cream/30 ${!activeThreadId ? 'hidden md:flex' : 'flex'}`}>
        {activeThreadId ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-panel-light">
              <div className="flex items-center gap-3">
                {/* Back button for mobile */}
                <button 
                  onClick={() => setActiveThreadId(null)}
                  className="md:hidden p-1.5 rounded-lg text-brand-muted-text hover:text-brand-dark-text transition-colors hover:bg-brand-sage/40 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Active user details */}
                <div className="w-9 h-9 rounded-full bg-brand-sage text-brand-forest flex items-center justify-center font-bold text-xs">
                  {activeThreadName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-dark-text leading-tight">{activeThreadName}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-forest animate-pulse"></span>
                    <span className="text-[10px] text-brand-muted-text font-semibold uppercase tracking-wider">
                      {user?.role === 'patient' ? 'Clinic Representative' : 'Verified Patient'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status information button */}
              <div className="text-[10px] text-brand-muted-text font-bold bg-brand-cream border border-brand-border px-2 py-1 rounded-lg">
                Secure Channel
              </div>
            </div>

            {/* Messages Body list */}
            <div 
              ref={messagesContainerRef} 
              className="flex-grow overflow-y-auto p-4 space-y-3.5 bg-brand-cream/10 cursor-default"
              onClick={() => {
                if (menuOpenMessageId !== null) {
                  setMenuOpenMessageId(null);
                }
              }}
            >
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <div className="w-8 h-8 border-2 border-brand-border border-t-brand-terracotta rounded-full animate-spin"></div>
                  <span className="text-xs text-brand-muted-text">Loading conversation history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6 space-y-2 max-w-xs">
                    <div className="w-12 h-12 bg-brand-sage/40 border border-brand-border text-brand-muted-text rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h5 className="text-xs font-bold text-brand-muted-text">Secure Direct Message</h5>
                    <p className="text-[10px] text-brand-muted-text/80">Send a greeting message below. A representative will get in touch with you shortly.</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const isDeleted = msg.is_deleted;
                  const isEditing = editingMessageId === msg.id;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex items-end gap-2 group relative ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                    >
                      {/* Received message avatar */}
                      {!isOwn && (
                        <div className="w-7 h-7 rounded-full bg-brand-sage text-brand-forest flex items-center justify-center text-[9px] font-black shrink-0 mb-1 select-none">
                          {activeThreadName ? activeThreadName.slice(0, 2).toUpperCase() : 'RE'}
                        </div>
                      )}
                      
                      <div className={`max-w-[70%] p-3 rounded-2xl text-xs space-y-1 relative shadow-sm ${
                        isDeleted
                          ? 'bg-brand-cream/60 text-brand-muted-text/50 rounded-2xl border border-brand-border/40'
                          : isOwn 
                            ? 'bg-brand-forest text-brand-light-text rounded-tr-sm border border-brand-forest/20' 
                            : 'bg-brand-sage text-brand-dark-text rounded-tl-sm border border-brand-border'
                      }`}>
                        {/* Text content / Edit form */}
                        {isEditing ? (
                          <div className="space-y-1.5 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/30 border border-brand-border rounded-lg p-2 focus:outline-none focus:border-brand-terracotta text-xs resize-none"
                              rows={2}
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingMessageId(null)}
                                className="px-2 py-1 bg-brand-sage hover:bg-brand-border text-brand-forest border border-brand-border rounded text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateMessage(msg.id)}
                                className="px-2 py-1 bg-brand-forest hover:bg-brand-forest/90 text-brand-cream font-bold rounded text-[10px] cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : isDeleted ? (
                          <p className="leading-relaxed italic text-brand-muted-text/60 select-none">[Message deleted]</p>
                        ) : (
                          <p className="leading-relaxed whitespace-pre-wrap select-text pr-3">{msg.message_text}</p>
                        )}
                        
                        {/* Meta: time + read status checks */}
                        <div className={`flex items-center justify-end gap-1 text-[9px] select-none text-right ${
                          isDeleted
                            ? 'text-brand-muted-text/50'
                            : isOwn 
                              ? 'text-brand-light-text/60' 
                              : 'text-brand-muted-text/80'
                        }`}>
                          {msg.edited_at && !isDeleted && (
                            <span className="opacity-75 mr-0.5">(edited)</span>
                          )}
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                          
                          {/* Telegram double/single ticks for sent messages */}
                          {isOwn && !isDeleted && (
                            <span className="font-bold flex">
                              {msg.is_read ? (
                                <svg className="w-3.5 h-3.5 text-brand-light-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-brand-light-text/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Options Menu Button (hover on desktop, always visible on mobile) */}
                        {isOwn && !isDeleted && !isEditing && (
                          <div className="absolute top-1 right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenMessageId(menuOpenMessageId === msg.id ? null : msg.id);
                              }}
                              className="p-0.5 rounded hover:bg-brand-sage/20 text-brand-muted-text hover:text-brand-dark-text transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {menuOpenMessageId === msg.id && (
                              <div className="absolute right-0 mt-1 w-20 bg-brand-cream border border-brand-border rounded-lg shadow-xl z-20 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditingText(msg.message_text);
                                    setMenuOpenMessageId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-brand-sage text-[10px] text-brand-dark-text font-medium cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowDeleteConfirmId(msg.id);
                                    setMenuOpenMessageId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 hover:text-rose-700 text-[10px] text-rose-600 font-medium border-t border-brand-border/40 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form field */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-brand-border bg-brand-panel-light flex items-center gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write a message..."
                className="flex-grow bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/50 border border-brand-border focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta/20 rounded-xl px-4 py-3 focus:outline-none transition-all text-xs"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-brand-forest hover:bg-brand-forest/90 disabled:opacity-40 text-brand-cream font-extrabold rounded-xl px-4.5 py-3 transition-all shrink-0 cursor-pointer flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            {/* Illustrative Chat Logo */}
            <div className="w-20 h-20 bg-brand-sage border border-brand-border rounded-full flex items-center justify-center text-brand-muted-text animate-pulse">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-center space-y-1.5 max-w-sm">
              <h4 className="text-sm font-bold text-brand-dark-text">Select a Chat Conversation</h4>
              <p className="text-xs text-brand-muted-text">
                Choose an active direct thread from the sidebar list, or tap "Chat with Lab" on your homepage search catalog to initialize contact.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
      {showDeleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-brand-forest/35 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteConfirmId(null)}>
          <div className="bg-brand-cream border border-brand-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-brand-dark-text">Delete Message?</h3>
            <p className="text-xs text-brand-muted-text">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-brand-sage hover:bg-brand-border/40 text-xs text-brand-forest font-bold transition-all border border-brand-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(showDeleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs text-white font-bold transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
