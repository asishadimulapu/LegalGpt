/**
 * Chat Page Component - NyayaSahay with Session History
 * Full-screen chat interface with persistent sessions
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Scale,
    Plus,
    Send,
    MessageSquare,
    AlertCircle,
    Loader2,
    Paperclip,
    FileText,
    X,
    Upload,
    Clock,
    Trash2
} from 'lucide-react';
import ChatBubble from '../components/ChatBubble';
import {
    sendChatMessage,
    sendChatWithFile,
    checkHealth,
    uploadFile,
    getChatSessions,
    getChatSession,
    deleteChatSession
} from '../services/api';
import '../styles/chat.css';

const EXAMPLE_QUERIES = [
    "What is Section 302 of IPC?",
    "What are my rights if arrested?",
    "Explain Article 21 of Constitution",
    "What is the punishment for theft?",
];

const ALLOWED_FILE_TYPES = ['.pdf', '.txt', '.doc', '.docx'];

function Chat({ user, onLogout, onAuthClick }) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [isBackendReady, setIsBackendReady] = useState(null);

    // Session history state
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState(null);

    // File upload state
    const [uploadedFile, setUploadedFile] = useState(null);
    const [fileContent, setFileContent] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Check backend health on mount
    useEffect(() => {
        const checkBackend = async () => {
            try {
                await checkHealth();
                setIsBackendReady(true);
            } catch (err) {
                setIsBackendReady(false);
                setError('Backend server is not running. Please start the server.');
            }
        };
        checkBackend();
    }, []);

    // Load user's sessions when user is available
    useEffect(() => {
        if (user && isBackendReady) {
            loadSessions();
        }
    }, [user, isBackendReady]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const loadSessions = async () => {
        if (!user) return;
        setLoadingSessions(true);
        try {
            const sessionList = await getChatSessions();
            setSessions(sessionList);
        } catch (err) {
            console.error('Failed to load sessions:', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    const loadSession = async (session) => {
        try {
            setActiveSessionId(session.id);
            const sessionDetail = await getChatSession(session.id);

            // Convert session messages to our format
            const loadedMessages = sessionDetail.messages.map((msg, index) => ({
                id: index,
                role: msg.role === 'user' ? 'user' : 'bot',
                content: msg.content,
                sources: msg.sources || [],
                timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            }));

            setMessages(loadedMessages);
            setSessionId(session.id);
        } catch (err) {
            setError('Failed to load chat session');
        }
    };

    const handleDeleteSession = async (e, session) => {
        e.stopPropagation();
        if (!confirm('Delete this chat session?')) return;

        try {
            await deleteChatSession(session.id);
            setSessions(prev => prev.filter(s => s.id !== session.id));
            if (activeSessionId === session.id) {
                handleNewChat();
            }
        } catch (err) {
            setError('Failed to delete session');
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getTimestamp = () => {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    // Handle file selection
    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_FILE_TYPES.includes(fileExt)) {
            setUploadError(`File type not supported. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}`);
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setUploadError('File too large. Maximum size: 10 MB');
            return;
        }

        setUploadError(null);
        setIsUploading(true);

        try {
            const response = await uploadFile(file);
            setUploadedFile({
                name: response.filename,
                type: response.file_type,
                size: file.size,
            });
            setFileContent(response.text_content);
        } catch (err) {
            setUploadError(err.message);
            setUploadedFile(null);
            setFileContent(null);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setFileContent(null);
        setUploadError(null);
    };

    const handleSend = async () => {
        const query = inputValue.trim();
        if (!query || isLoading) return;

        setInputValue('');
        setError(null);

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: query,
            timestamp: getTimestamp(),
            hasFile: !!uploadedFile,
            fileName: uploadedFile?.name,
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            let response;

            if (fileContent) {
                // Pass filename for chat history context
                response = await sendChatWithFile(query, fileContent, sessionId, uploadedFile?.name);
            } else {
                response = await sendChatMessage(query, sessionId);
            }

            if (response.session_id) {
                setSessionId(response.session_id);
                setActiveSessionId(response.session_id);
                // Reload sessions to show new one
                if (user) {
                    loadSessions();
                }
            }

            const botMessage = {
                id: Date.now() + 1,
                role: 'bot',
                content: response.answer,
                sources: response.sources || [],
                isFallback: response.is_fallback || false,
                latency: response.latency_ms,
                timestamp: getTimestamp(),
                basedOnFile: !!fileContent,
            };
            setMessages(prev => [...prev, botMessage]);

            if (fileContent) {
                setUploadedFile(null);
                setFileContent(null);
            }

        } catch (err) {
            const errorMsg = typeof err === 'string'
                ? err
                : (err?.message || err?.detail || JSON.stringify(err) || 'An unexpected error occurred');
            const errorMessage = {
                id: Date.now() + 1,
                role: 'bot',
                content: `I apologize, but I encountered an error: ${errorMsg}. Please try again.`,
                isFallback: true,
                timestamp: getTimestamp(),
            };
            setMessages(prev => [...prev, errorMessage]);
            setError(errorMsg);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleExampleClick = (query) => {
        setInputValue(query);
        inputRef.current?.focus();
    };

    const handleNewChat = () => {
        setMessages([]);
        setSessionId(null);
        setActiveSessionId(null);
        setError(null);
        setUploadedFile(null);
        setFileContent(null);
        setUploadError(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (isBackendReady === null) {
        return (
            <div className="chat-loading">
                <Loader2 className="chat-loading-spinner" size={48} />
                <p>Connecting to Legal Assistant...</p>
            </div>
        );
    }

    return (
        <div className={`chat-page ${!user ? 'guest-mode' : ''}`}>
            {/* Sidebar — only for signed-in users */}
            {user && (
                <aside className="chat-sidebar">
                    <button className="new-chat-btn" onClick={handleNewChat}>
                        <Plus size={18} /> New Chat
                    </button>

                    <div className="sidebar-section">
                        <h4>
                            <Clock size={14} /> Chat History
                        </h4>
                        {loadingSessions ? (
                            <div className="sessions-loading">
                                <Loader2 size={16} className="spinning" />
                                Loading...
                            </div>
                        ) : sessions.length > 0 ? (
                            <div className="session-list">
                                {sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                                        onClick={() => loadSession(session)}
                                    >
                                        <MessageSquare size={14} />
                                        <div className="session-info">
                                            <span className="session-title">{session.title}</span>
                                            <span className="session-date">{formatDate(session.created_at)}</span>
                                        </div>
                                        <button
                                            className="session-delete"
                                            onClick={(e) => handleDeleteSession(e, session)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-sessions">No chat history yet</p>
                        )}
                    </div>
                </aside>
            )}

            {/* Main Chat Area */}
            <main className="chat-main">
                {/* Guest Header — replaces the app Header for unauthenticated chat */}
                {!user && (
                    <header className="guest-chat-header">
                        <a href="/" className="guest-chat-brand">
                            <Scale size={22} />
                            <span>NyayaSahay</span>
                        </a>
                        <div className="guest-chat-actions">
                            <button className="guest-signin-btn" onClick={() => onAuthClick?.('signin')}>Sign In</button>
                            <button className="guest-signup-btn" onClick={() => onAuthClick?.('register')}>Get Started</button>
                        </div>
                    </header>
                )}

                {/* Chat Header */}
                <header className="chat-top-header">
                    <div className="chat-header-info">
                        <div className="chat-avatar">
                            <Scale size={24} />
                        </div>
                        <div>
                            <h2>Legal Assistant</h2>
                            <span className={`status ${isBackendReady ? 'online' : 'offline'}`}>
                                <span className="status-dot"></span>
                                {isBackendReady ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Messages */}
                <div className="chat-messages-container">
                    {messages.length === 0 ? (
                        <div className="chat-empty">
                            <div className="empty-icon">
                                <Scale size={40} />
                            </div>
                            <h2>Welcome to NyayaSahay</h2>
                            <p>Your AI-powered legal assistant for Indian law</p>
                            <p className="empty-subtitle">
                                Ask any question about IPC, CrPC, Constitution, or your legal rights
                            </p>

                            {/* File Upload Promo */}
                            <div className="upload-promo">
                                <Upload size={20} />
                                <span>You can also <strong>upload case documents</strong> (PDF, TXT, DOC) for analysis</span>
                            </div>

                            <div className="example-cards">
                                {EXAMPLE_QUERIES.map((query, index) => (
                                    <button
                                        key={index}
                                        className="example-card"
                                        onClick={() => handleExampleClick(query)}
                                    >
                                        <MessageSquare size={18} className="example-icon" />
                                        {query}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="chat-messages">
                            {messages.map((message) => (
                                <ChatBubble
                                    key={message.id}
                                    role={message.role}
                                    content={message.content}
                                    sources={message.sources}
                                    isFallback={message.isFallback}
                                    latency={message.latency}
                                    timestamp={message.timestamp}
                                    hasFile={message.hasFile}
                                    fileName={message.fileName}
                                    basedOnFile={message.basedOnFile}
                                />
                            ))}

                            {isLoading && (
                                <div className="typing-indicator">
                                    <div className="typing-avatar">
                                        <Scale size={20} />
                                    </div>
                                    <div className="typing-bubble">
                                        <div className="typing-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                        <span className="typing-text">
                                            {fileContent ? 'Analyzing your document...' : 'Analyzing your question...'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Backend Error */}
                {!isBackendReady && (
                    <div className="backend-error">
                        <AlertCircle size={18} />
                        Backend server is not running. Please start it with: <code>python run.py</code>
                    </div>
                )}

                {/* File Preview */}
                {uploadedFile && (
                    <div className="file-preview">
                        <div className="file-preview-content">
                            <FileText size={20} className="file-icon" />
                            <div className="file-info">
                                <span className="file-name">{uploadedFile.name}</span>
                                <span className="file-size">{formatFileSize(uploadedFile.size)} • {uploadedFile.type}</span>
                            </div>
                        </div>
                        <button className="file-remove-btn" onClick={handleRemoveFile}>
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Upload Error */}
                {uploadError && (
                    <div className="upload-error">
                        <AlertCircle size={16} />
                        {uploadError}
                        <button onClick={() => setUploadError(null)}><X size={14} /></button>
                    </div>
                )}

                {/* Input Area */}
                <div className="chat-input-area">
                    <div className="input-wrapper">
                        {/* File Upload Button */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".pdf,.txt,.doc,.docx"
                            style={{ display: 'none' }}
                        />
                        <button
                            className="upload-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || !isBackendReady || isUploading}
                            title="Upload case document"
                        >
                            {isUploading ? (
                                <Loader2 size={20} className="spinning" />
                            ) : (
                                <Paperclip size={20} />
                            )}
                        </button>

                        <textarea
                            ref={inputRef}
                            className="chat-input"
                            placeholder={uploadedFile
                                ? "Ask a question about your uploaded document..."
                                : "Describe your legal situation..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading || !isBackendReady}
                            rows={1}
                        />
                        <button
                            className="send-btn"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isLoading || !isBackendReady}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <p className="input-disclaimer">
                        <AlertCircle size={14} /> This provides legal information only, not legal advice. Consult a professional for legal matters.
                    </p>
                </div>
            </main>
        </div>
    );
}

export default Chat;
