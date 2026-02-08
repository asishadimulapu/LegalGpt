/**
 * Landing Page Component - NyayaSahay Style with Lucide Icons
 * Hero section with chat preview, features, and how it works
 * Section IDs for smooth scroll navigation
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Scale,
    Shield,
    BookOpen,
    Search,
    Lock,
    Zap,
    MessageSquare,
    Brain,
    FileText,
    CheckCircle,
    AlertTriangle,
    Phone,
    Users,
    Clock,
    Unlock,
    VolumeX,
    Sparkles,
    Send,
    ArrowRight,
    Rocket,
    MessageCircle
} from 'lucide-react';
import '../styles/landing.css';

function Landing({ onTryNow, onAuthClick }) {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const features = [
        {
            icon: <FileText size={28} />,
            title: 'Section Verification',
            description: 'Instantly verify if IPC/CrPC sections charged against you are applicable to your situation using AI analysis.',
            badgeColor: 'orange'
        },
        {
            icon: <Shield size={28} />,
            title: 'Rights at Each Stage',
            description: 'Know your fundamental rights during detention, FIR registration, arrest, and judicial proceedings.',
            badgeColor: 'green'
        },
        {
            icon: <BookOpen size={28} />,
            title: 'Legal Knowledge Base',
            description: 'Access simplified explanations of complex legal sections, procedures, and court precedents.',
            badgeColor: 'blue'
        },
        {
            icon: <Search size={28} />,
            title: 'Case Analysis',
            description: 'Get AI-powered analysis of your situation with relevant case laws and possible legal outcomes.',
            badgeColor: 'purple'
        },
        {
            icon: <Lock size={28} />,
            title: '100% Confidential',
            description: 'Your queries and data are encrypted and never shared. Complete privacy guaranteed.',
            badgeColor: 'green'
        },
        {
            icon: <Zap size={28} />,
            title: 'Instant Responses',
            description: 'Get immediate legal guidance powered by advanced RAG technology and Groq LLM.',
            badgeColor: 'orange'
        },
    ];

    const steps = [
        {
            number: '01',
            icon: <MessageSquare size={32} />,
            title: 'Describe Your Situation',
            description: 'Tell our AI about your legal situation in simple words. No legal jargon needed.'
        },
        {
            number: '02',
            icon: <Brain size={32} />,
            title: 'AI Analyzes Your Case',
            description: 'Our RAG-powered AI searches through IPC, CrPC, and case precedents to find relevant information.'
        },
        {
            number: '03',
            icon: <FileText size={32} />,
            title: 'Get Legal Insights',
            description: 'Receive clear explanations of applicable sections, your rights, and recommended actions.'
        },
        {
            number: '04',
            icon: <CheckCircle size={32} />,
            title: 'Take Informed Action',
            description: 'Use the knowledge to protect your rights and make informed decisions about your case.'
        },
    ];

    const rights = [
        {
            icon: <AlertTriangle size={24} />,
            title: 'Right to Know Charges',
            description: 'You must be informed of the grounds of arrest at the time of arrest.',
            article: 'Article 22(1)'
        },
        {
            icon: <Phone size={24} />,
            title: 'Right to Legal Counsel',
            description: 'You have the right to consult and be defended by a legal practitioner of your choice.',
            article: 'Article 22(1)'
        },
        {
            icon: <Users size={24} />,
            title: 'Right to Inform Family',
            description: 'Police must inform your family or friend about your arrest and detention location.',
            article: 'Section 50A CrPC'
        },
        {
            icon: <Clock size={24} />,
            title: '24-Hour Magistrate Rule',
            description: 'You must be produced before a magistrate within 24 hours of arrest.',
            article: 'Article 22(2)'
        },
        {
            icon: <Unlock size={24} />,
            title: 'Right to Bail',
            description: 'For bailable offenses, you have the right to be released on bail.',
            article: 'Section 436 CrPC'
        },
        {
            icon: <VolumeX size={24} />,
            title: 'Right Against Self-Incrimination',
            description: 'You cannot be compelled to be a witness against yourself.',
            article: 'Article 20(3)'
        },
    ];

    // Handle button click - navigate to chat
    const handleStartChat = () => {
        navigate('/chat');
    };

    return (
        <div className={`landing ${isVisible ? 'visible' : ''}`}>
            {/* Hero Section */}
            <section id="hero" className="hero">
                <div className="hero-bg">
                    <div className="hero-gradient"></div>
                    <div className="hero-particles">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="particle" style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${3 + Math.random() * 4}s`
                            }}></div>
                        ))}
                    </div>
                </div>
                <div className="hero-container">
                    <div className="hero-content animate-fade-in-up">
                        <span className="hero-badge animate-pulse-glow">
                            <Sparkles size={16} /> AI-Powered Legal Assistant
                        </span>
                        <h1 className="hero-title">
                            Get Instant<br />
                            <span className="gradient-text">Legal Guidance</span>
                        </h1>
                        <p className="hero-description">
                            Our AI understands your situation in plain language and provides
                            accurate legal information based on Indian law. No legal jargon,
                            just clear answers.
                        </p>
                        <ul className="hero-features">
                            <li className="stagger-1 animate-fade-in-up"><span className="check"><CheckCircle size={18} /></span> Trained on IPC, CrPC & case precedents</li>
                            <li className="stagger-2 animate-fade-in-up"><span className="check"><CheckCircle size={18} /></span> Explains complex sections simply</li>
                            <li className="stagger-3 animate-fade-in-up"><span className="check"><CheckCircle size={18} /></span> Available 24/7 with instant responses</li>
                        </ul>
                        <div className="hero-buttons">
                            <button
                                className="btn btn-primary hero-cta animate-pulse-glow"
                                onClick={handleStartChat}
                            >
                                <MessageCircle size={18} /> Start Free Consultation <ArrowRight size={18} />
                            </button>
                            <button
                                className="btn btn-outline hero-cta-secondary"
                                onClick={() => onAuthClick && onAuthClick('register')}
                            >
                                Create Account
                            </button>
                        </div>
                    </div>

                    {/* Chat Preview */}
                    <div className="hero-chat-preview animate-slide-right">
                        <div className="chat-preview-card animate-float">
                            <div className="chat-preview-header">
                                <div className="chat-preview-avatar">
                                    <Scale size={24} />
                                </div>
                                <div className="chat-preview-info">
                                    <span className="chat-preview-name">Legal Assistant</span>
                                    <span className="chat-preview-status">Always here to help</span>
                                </div>
                                <div className="chat-preview-online">
                                    <span className="online-dot"></span>
                                    Online
                                </div>
                            </div>
                            <div className="chat-preview-messages">
                                <div className="preview-message user animate-slide-right" style={{ animationDelay: '0.5s' }}>
                                    I was detained for questioning about a theft. What are my rights?
                                </div>
                                <div className="preview-message bot animate-slide-left" style={{ animationDelay: '1s' }}>
                                    <p>During detention for questioning, you have several important rights:</p>
                                    <p><strong>1. Right to know the reason</strong> - Police must inform you why you're being detained</p>
                                    <p><strong>2. Right to remain silent</strong> - You're not obligated to answer questions that may incriminate you (Article 20(3))</p>
                                </div>
                            </div>
                            <div className="chat-preview-input">
                                <input type="text" placeholder="Describe your legal situation..." disabled />
                                <button className="chat-preview-send hover-scale" onClick={handleStartChat}>
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="container">
                    <div className="section-header animate-fade-in-up">
                        <span className="badge badge-primary">Features</span>
                        <h2>Everything You Need for<br /><span className="gradient-text">Legal Awareness</span></h2>
                        <p>Comprehensive tools to understand and protect your legal rights</p>
                    </div>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className={`feature-card hover-lift stagger-${index + 1} animate-fade-in-up`}
                            >
                                <div className={`feature-icon ${feature.badgeColor}`}>
                                    {feature.icon}
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="how-it-works-section">
                <div className="container">
                    <div className="section-header animate-fade-in-up">
                        <span className="badge badge-primary">How It Works</span>
                        <h2>Legal Help in <span className="gradient-text">4 Simple Steps</span></h2>
                        <p>Getting legal guidance has never been easier. Our AI simplifies the complex legal system for you.</p>
                    </div>
                    <div className="steps-grid">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className={`step-card hover-lift stagger-${index + 1} animate-fade-in-up`}
                            >
                                <div className="step-icon animate-float" style={{ animationDelay: `${index * 0.2}s` }}>
                                    {step.icon}
                                    <span className="step-number">{step.number}</span>
                                </div>
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Rights Section */}
            <section id="your-rights" className="rights-section">
                <div className="container">
                    <div className="section-header animate-fade-in-up">
                        <span className="badge badge-primary" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-orange)' }}>Your Rights</span>
                        <h2 className="rights-title">Fundamental Rights<br /><span className="gradient-text">During Police Interactions</span></h2>
                        <p>Every Indian citizen has these constitutional rights. Knowing them can protect you from unlawful actions.</p>
                    </div>
                    <div className="rights-grid">
                        {rights.map((right, index) => (
                            <div
                                key={index}
                                className={`right-card hover-lift stagger-${index + 1} animate-fade-in-up`}
                            >
                                <div className="right-header">
                                    <span className="right-icon">{right.icon}</span>
                                    <span className="right-article">{right.article}</span>
                                </div>
                                <h3>{right.title}</h3>
                                <p>{right.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section id="cta" className="cta-section">
                <div className="container">
                    <div className="cta-content animate-fade-in-up">
                        <h2>Ready to Know Your <span className="gradient-text">Rights?</span></h2>
                        <p>Start your free legal consultation now. No registration required.</p>
                        <button
                            className="btn btn-primary animate-pulse-glow"
                            onClick={handleStartChat}
                        >
                            <Rocket size={20} /> Try Legal Assistant Free <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Landing;
