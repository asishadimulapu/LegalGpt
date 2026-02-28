/**
 * ChatBubble Component - LawGPT Style with Lucide Icons
 * Teal user bubbles, white bot bubbles
 */

import React from 'react';
import { Scale, User, BookOpen, Info, AlertTriangle } from 'lucide-react';
import '../styles/chatBubble.css';

function ChatBubble({
    role,
    content,
    sources = [],
    isFallback = false,
    latency = null,
    timestamp = null
}) {
    const getConfidence = () => {
        if (isFallback) return { level: 'low', value: 0, text: 'No match found' };
        if (sources.length >= 3) return { level: 'high', value: 85, text: 'High confidence' };
        if (sources.length >= 1) return { level: 'medium', value: 60, text: 'Medium confidence' };
        return { level: 'low', value: 30, text: 'Low confidence' };
    };

    const confidence = role === 'bot' ? getConfidence() : null;

    return (
        <div className={`message-row ${role}`}>
            {/* Avatar for bot */}
            {role === 'bot' && (
                <div className="message-avatar bot">
                    <Scale size={20} />
                </div>
            )}

            <div className={`message-bubble ${role} ${isFallback ? 'fallback' : ''}`}>
                {/* Fallback Notice */}
                {isFallback && role === 'bot' && (
                    <div className="fallback-banner">
                        <Info size={16} />
                        Information not found in legal database
                    </div>
                )}

                {/* Content */}
                <div className="message-text">
                    {content}
                </div>

                {/* Legal References */}
                {role === 'bot' && sources && sources.length > 0 && !isFallback && (
                    <div className="sources-section">
                        <div className="sources-title">
                            <BookOpen size={14} /> Legal References
                        </div>
                        <div className="sources-list">
                            {sources.slice(0, 3).map((source, index) => (
                                <div key={index} className="source-tag">
                                    <span className="source-act">{source.act}</span>
                                    {source.section && (
                                        <span className="source-section">{source.section}</span>
                                    )}
                                </div>
                            ))}
                            {sources.length > 3 && (
                                <span className="sources-more">+{sources.length - 3} more</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Confidence Bar */}
                {role === 'bot' && confidence && (
                    <div className="confidence-section">
                        <span className="confidence-label">Confidence:</span>
                        <div className="confidence-bar-wrapper">
                            <div
                                className={`confidence-bar-fill ${confidence.level}`}
                                style={{ width: `${confidence.value}%` }}
                            />
                        </div>
                        <span className={`confidence-text ${confidence.level}`}>
                            {confidence.text}
                        </span>
                    </div>
                )}

                {/* Timestamp */}
                {timestamp && (
                    <div className="message-meta">
                        {timestamp}
                        {latency && role === 'bot' && ` • ${latency}ms`}
                    </div>
                )}
            </div>

            {/* Avatar for user */}
            {role === 'user' && (
                <div className="message-avatar user">
                    <User size={20} />
                </div>
            )}
        </div>
    );
}

export default ChatBubble;
