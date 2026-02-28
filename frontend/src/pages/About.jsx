/**
 * About Page Component - LawGPT Style
 * Clean project description with modern design
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Scale,
    ArrowLeft,
    Database,
    Zap,
    Shield,
    Brain,
    FileText,
    Search,
    Server,
    Code,
    Palette,
    Globe,
    CheckCircle,
    BookOpen,
    AlertTriangle,
    Cpu,
    Layers,
    GitBranch
} from 'lucide-react';
import '../styles/about.css';

function About() {
    const [isVisible, setIsVisible] = useState(false);
    const isAuthenticated = !!localStorage.getItem('LawGPT_user');

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const stats = [
        { icon: <FileText size={24} />, value: '29,000+', label: 'Legal Documents' },
        { icon: <BookOpen size={24} />, value: '12+', label: 'Legal Acts' },
        { icon: <Zap size={24} />, value: '< 2s', label: 'Response Time' },
        { icon: <Shield size={24} />, value: '99%', label: 'Accuracy Rate' },
    ];

    const backendTech = [
        { icon: <Code size={24} />, name: 'FastAPI', desc: 'Python web framework for high-performance APIs' },
        { icon: <GitBranch size={24} />, name: 'LangChain', desc: 'LLM orchestration and RAG pipeline' },
        { icon: <Search size={24} />, name: 'FAISS', desc: 'Facebook AI similarity search for vectors' },
        { icon: <Database size={24} />, name: 'PostgreSQL', desc: 'Relational database for chat history' },
        { icon: <Zap size={24} />, name: 'Groq', desc: 'Ultra-fast LLM inference engine' },
        { icon: <Brain size={24} />, name: 'HuggingFace', desc: 'Sentence transformers for embeddings' },
    ];

    const frontendTech = [
        { icon: <Layers size={24} />, name: 'React.js', desc: 'Component-based UI library' },
        { icon: <Palette size={24} />, name: 'CSS3', desc: 'Modern styling with animations' },
        { icon: <Globe size={24} />, name: 'Fetch API', desc: 'Native HTTP client for requests' },
    ];

    const antiHallucination = [
        { icon: <FileText size={18} />, title: 'Context-Only Generation', desc: 'LLM answers using only retrieved legal documents' },
        { icon: <Cpu size={18} />, title: 'Temperature = 0', desc: 'Deterministic outputs, no creative responses' },
        { icon: <Shield size={18} />, title: 'Fallback Response', desc: 'Clear message when information is not found' },
        { icon: <BookOpen size={18} />, title: 'Citation Requirement', desc: 'Every answer must cite Act + Section' },
        { icon: <CheckCircle size={18} />, title: 'Confidence Indicator', desc: 'Shows reliability score of each response' },
    ];

    const legalSources = [
        'Indian Penal Code (IPC)',
        'Constitution of India',
        'Code of Criminal Procedure (CrPC)',
        'Code of Civil Procedure (CPC)',
        'Indian Contract Act',
        'Indian Evidence Act',
        'Consumer Protection Act',
        'Motor Vehicles Act',
    ];

    return (
        <div className={`about-page ${isVisible ? 'visible' : ''}`}>
            {/* Hero Section */}
            <section className="about-hero">
                <div className="about-hero-bg">
                    <div className="about-hero-gradient"></div>
                    <div className="about-hero-particles">
                        {[...Array(15)].map((_, i) => (
                            <div key={i} className="particle" style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${3 + Math.random() * 4}s`
                            }}></div>
                        ))}
                    </div>
                </div>
                <div className="about-hero-content">
                    {!isAuthenticated && (
                        <Link to="/" className="back-link">
                            <ArrowLeft size={20} /> Back to Home
                        </Link>
                    )}
                    <div className="about-hero-text">
                        <div className="about-badge">
                            <Scale size={20} /> About LawGPT
                        </div>
                        <h1>AI-Powered <span className="gradient-text">Legal Assistant</span></h1>
                        <p>
                            An intelligent legal question answering system built with
                            Retrieval-Augmented Generation (RAG) technology, providing accurate
                            answers grounded in authentic Indian legal documents.
                        </p>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="about-stats">
                <div className="container">
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <div key={index} className="stat-card">
                                <div className="stat-icon">{stat.icon}</div>
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* What is RAG Section */}
            <section className="about-section rag-section">
                <div className="container">
                    <div className="section-header">
                        <span className="badge badge-primary">
                            <Brain size={16} /> Technology
                        </span>
                        <h2>What is <span className="gradient-text">RAG?</span></h2>
                        <p>Retrieval-Augmented Generation combines the best of search and AI</p>
                    </div>
                    <div className="rag-flow">
                        <div className="rag-step">
                            <div className="rag-step-icon">
                                <Search size={28} />
                            </div>
                            <h3>Retrieval</h3>
                            <p>Find relevant documents from the legal database using semantic search</p>
                        </div>
                        <div className="rag-arrow">→</div>
                        <div className="rag-step">
                            <div className="rag-step-icon">
                                <Layers size={28} />
                            </div>
                            <h3>Augmentation</h3>
                            <p>Add retrieved context to the AI prompt for grounded answers</p>
                        </div>
                        <div className="rag-arrow">→</div>
                        <div className="rag-step">
                            <div className="rag-step-icon">
                                <Brain size={28} />
                            </div>
                            <h3>Generation</h3>
                            <p>LLM generates answer using ONLY the provided legal context</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tech Stack Section */}
            <section className="about-section tech-section">
                <div className="container">
                    <div className="section-header">
                        <span className="badge badge-primary">
                            <Server size={16} /> Stack
                        </span>
                        <h2>Technology <span className="gradient-text">Stack</span></h2>
                        <p>Built with modern, scalable technologies</p>
                    </div>

                    <div className="tech-category">
                        <h3><Server size={20} /> Backend</h3>
                        <div className="tech-grid">
                            {backendTech.map((tech, index) => (
                                <div key={index} className="tech-card">
                                    <div className="tech-card-icon">{tech.icon}</div>
                                    <div className="tech-card-info">
                                        <h4>{tech.name}</h4>
                                        <p>{tech.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="tech-category">
                        <h3><Palette size={20} /> Frontend</h3>
                        <div className="tech-grid">
                            {frontendTech.map((tech, index) => (
                                <div key={index} className="tech-card">
                                    <div className="tech-card-icon">{tech.icon}</div>
                                    <div className="tech-card-info">
                                        <h4>{tech.name}</h4>
                                        <p>{tech.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Architecture Section */}
            <section className="about-section arch-section">
                <div className="container">
                    <div className="section-header">
                        <span className="badge badge-primary">
                            <Layers size={16} /> Architecture
                        </span>
                        <h2>System <span className="gradient-text">Architecture</span></h2>
                    </div>
                    <div className="architecture-visual">
                        <div className="arch-layer">
                            <div className="arch-box frontend">
                                <Layers size={24} />
                                <span>React Frontend</span>
                            </div>
                        </div>
                        <div className="arch-connector">↓</div>
                        <div className="arch-layer">
                            <div className="arch-box backend">
                                <Server size={24} />
                                <span>FastAPI Backend</span>
                            </div>
                        </div>
                        <div className="arch-connector-split">
                            <span>↓</span>
                            <span>↓</span>
                        </div>
                        <div className="arch-layer arch-layer-split">
                            <div className="arch-box database">
                                <Search size={24} />
                                <span>FAISS Vectors</span>
                            </div>
                            <div className="arch-box database">
                                <Database size={24} />
                                <span>PostgreSQL</span>
                            </div>
                        </div>
                        <div className="arch-connector">↓</div>
                        <div className="arch-layer">
                            <div className="arch-box llm">
                                <Zap size={24} />
                                <span>Groq LLM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Anti-Hallucination Section */}
            <section className="about-section safety-section">
                <div className="container">
                    <div className="section-header">
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}>
                            <Shield size={16} /> Safety
                        </span>
                        <h2>Anti-Hallucination <span className="gradient-text">Strategy</span></h2>
                        <p>For legal applications, accuracy is critical. Multiple safeguards prevent AI hallucinations.</p>
                    </div>
                    <div className="safety-grid">
                        {antiHallucination.map((item, index) => (
                            <div key={index} className="safety-card">
                                <div className="safety-icon">{item.icon}</div>
                                <h4>{item.title}</h4>
                                <p>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Legal Sources Section */}
            <section className="about-section sources-section">
                <div className="container">
                    <div className="section-header">
                        <span className="badge badge-primary">
                            <BookOpen size={16} /> Sources
                        </span>
                        <h2>Legal <span className="gradient-text">Data Sources</span></h2>
                        <p>Trained on comprehensive Indian legal documents</p>
                    </div>
                    <div className="sources-list">
                        {legalSources.map((source, index) => (
                            <div key={index} className="source-item">
                                <CheckCircle size={18} /> {source}
                            </div>
                        ))}
                    </div>
                    <p className="sources-note">
                        Dataset: <strong>viber1/indian-law-dataset</strong> from Hugging Face (24,000+ Q&A pairs)
                    </p>
                </div>
            </section>

            {/* Disclaimer Section */}
            <section className="about-section disclaimer-section">
                <div className="container">
                    <div className="disclaimer-box">
                        <AlertTriangle size={32} />
                        <div>
                            <h3>Important Disclaimer</h3>
                            <p>
                                This system provides <strong>legal information only</strong>, not legal advice.
                                The information is for educational purposes. Always consult a qualified
                                legal professional for legal matters.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section — Guest only */}
            {!isAuthenticated && (
                <section className="about-cta">
                    <div className="container">
                        <div className="cta-content">
                            <h2>Ready to Try <span className="gradient-text">LawGPT?</span></h2>
                            <p>Start asking your legal questions now</p>
                            <Link to="/chat" className="btn btn-primary">
                                Start Free Consultation
                            </Link>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

export default About;
