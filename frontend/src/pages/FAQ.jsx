/**
 * FAQ Page - LawGPT
 * Frequently Asked Questions for better content value
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import '../styles/legal.css';

function FAQ() {
    const [searchTerm, setSearchTerm] = useState('');
    const [openIndex, setOpenIndex] = useState(null);

    const faqData = [
        {
            category: "About LawGPT",
            questions: [
                {
                    q: "What is LawGPT?",
                    a: "LawGPT is an AI-powered legal information platform that helps users understand Indian law. It uses advanced Retrieval-Augmented Generation (RAG) technology to provide accurate answers based on authentic legal documents including IPC, CrPC, Constitution of India, and various legal acts."
                },
                {
                    q: "Is LawGPT free to use?",
                    a: "Yes, LawGPT is completely free to use. You can ask unlimited legal questions, create an account to save your chat history, and access all features without any charges."
                },
                {
                    q: "Does LawGPT provide legal advice?",
                    a: "No. LawGPT provides legal information only, NOT legal advice. The information is for educational purposes. Always consult a qualified, licensed attorney for advice specific to your legal situation."
                }
            ]
        },
        {
            category: "Using the Service",
            questions: [
                {
                    q: "How do I ask a legal question?",
                    a: "Simply navigate to the Chat page and type your question in plain language. You don't need to use legal jargon. Our AI will understand your question and provide relevant legal information based on Indian law."
                },
                {
                    q: "What kind of questions can I ask?",
                    a: "You can ask about: IPC sections, CrPC procedures, constitutional rights, criminal law, civil procedures, contract law, evidence law, consumer protection, motor vehicle laws, and more. For example: 'What is Section 302 IPC?', 'What are my rights if arrested?', 'How to file an FIR?'"
                },
                {
                    q: "Do I need to create an account?",
                    a: "No, you can use LawGPT without creating an account. However, creating a free account allows you to: save your chat history, access previous conversations, and have a personalized experience."
                },
                {
                    q: "Can I upload documents for analysis?",
                    a: "Yes, you can upload legal documents (PDF, TXT, DOC, DOCX) up to 10 MB for analysis. The AI will read the document and answer questions about it."
                }
            ]
        },
        {
            category: "Legal Information",
            questions: [
                {
                    q: "What legal sources does LawGPT use?",
                    a: "LawGPT is trained on comprehensive Indian legal documents including: Indian Penal Code (IPC), Code of Criminal Procedure (CrPC), Constitution of India, Code of Civil Procedure (CPC), Indian Contract Act, Indian Evidence Act, Consumer Protection Act, Motor Vehicles Act, IT Act, POCSO Act, and over 29,000 legal Q&A pairs."
                },
                {
                    q: "How accurate is the legal information?",
                    a: "Our AI system has a 99% accuracy rate in retrieving relevant legal information. However, laws can be complex and subject to interpretation. The system provides information with citations to source documents, but you should always verify critical information with official sources or legal professionals."
                },
                {
                    q: "Is the legal information up to date?",
                    a: "We regularly update our database with the latest legal information. However, laws change frequently. Always check the date of the information provided and verify with current legal resources for time-sensitive matters."
                },
                {
                    q: "What should I do if I need urgent legal help?",
                    a: "If you have an urgent legal matter: 1) Contact a qualified lawyer immediately, 2) Call legal aid helplines (e.g., National Legal Services Authority - 15100), 3) Visit your nearest police station if it's an emergency. LawGPT is for information only and cannot provide emergency legal assistance."
                }
            ]
        },
        {
            category: "Privacy & Security",
            questions: [
                {
                    q: "Is my information confidential?",
                    a: "Yes. All your queries and chat data are encrypted and stored securely. We never share your personal information or queries with third parties. Your conversations are completely confidential. See our Privacy Policy for complete details."
                },
                {
                    q: "What data do you collect?",
                    a: "We collect: account information (email, username), your chat queries and responses, usage data (pages visited, features used), and technical data (browser type, IP address). We use this data only to provide and improve our service."
                },
                {
                    q: "Can I delete my data?",
                    a: "Yes. You can delete your account and all associated data at any time through your account settings or by contacting us at privacy@law-gpt.app. Upon deletion, all your chat history and personal information will be permanently removed."
                },
                {
                    q: "Do you use cookies?",
                    a: "Yes, we use cookies for essential functions (authentication, security), analytics (understanding usage), and advertising (Google AdSense). You can control cookies through your browser settings. See our Privacy Policy for details."
                }
            ]
        },
        {
            category: "Technical",
            questions: [
                {
                    q: "What technology powers LawGPT?",
                    a: "LawGPT uses: Retrieval-Augmented Generation (RAG) for accurate answers, Groq LLM for fast AI responses, FAISS for semantic search, HuggingFace embeddings, FastAPI backend, React.js frontend, and PostgreSQL database. This ensures fast, accurate, and reliable legal information."
                },
                {
                    q: "Why is RAG better than regular chatbots?",
                    a: "RAG (Retrieval-Augmented Generation) retrieves actual legal documents before generating answers, ensuring responses are grounded in authentic sources. Regular chatbots might 'hallucinate' or make up information. RAG provides cited, verifiable answers from real legal texts."
                },
                {
                    q: "How fast are the responses?",
                    a: "Our system provides responses in under 2 seconds thanks to Groq's ultra-fast LLM inference and optimized FAISS vector search. You get instant legal information without waiting."
                },
                {
                    q: "Which browsers are supported?",
                    a: "LawGPT works on all modern browsers: Chrome, Firefox, Safari, Edge, and Opera. We recommend using the latest version of your browser for the best experience."
                },
                {
                    q: "Is there a mobile app?",
                    a: "Currently, LawGPT is available as a web application optimized for mobile browsers. A dedicated mobile app is under development and will be available soon on Android and iOS."
                }
            ]
        },
        {
            category: "Rights & Legal Procedures",
            questions: [
                {
                    q: "What are my rights if I'm arrested?",
                    a: "Your fundamental rights upon arrest include: 1) Right to know the grounds of arrest (Article 22(1)), 2) Right to legal counsel, 3) Right to inform family/friend (Section 50A CrPC), 4) Right to be produced before magistrate within 24 hours (Article 22(2)), 5) Right to bail for bailable offenses (Section 436 CrPC), 6) Right against self-incrimination (Article 20(3))."
                },
                {
                    q: "How do I file an FIR?",
                    a: "To file an FIR: 1) Visit the nearest police station in whose jurisdiction the crime occurred, 2) Provide detailed information about the incident orally or in writing, 3) Police are legally obligated to register FIR for cognizable offenses (Section 154 CrPC), 4) Get a free copy of the FIR, 5) If police refuse, you can approach the Superintendent of Police or file a complaint with the Magistrate."
                },
                {
                    q: "What is the difference between bailable and non-bailable offenses?",
                    a: "Bailable offenses: You have a right to bail (e.g., simple hurt, theft under certain amounts). Police or court must grant bail. Non-bailable offenses: Bail is at court's discretion (e.g., murder, rape, serious crimes). You must apply to court for bail. First Schedule of CrPC lists all offenses with their bail classification."
                },
                {
                    q: "Can police detain me without arrest?",
                    a: "Yes, police can detain for questioning without formal arrest, but with limits: 1) Detention must be reasonable in duration, 2) You must be informed why you're detained, 3) You have the right to remain silent, 4) You cannot be detained beyond 24 hours without arrest, 5) If arrested, all arrest rights apply immediately."
                }
            ]
        },
        {
            category: "Troubleshooting",
            questions: [
                {
                    q: "The AI is not responding. What should I do?",
                    a: "If the AI doesn't respond: 1) Check your internet connection, 2) Refresh the page, 3) Try clearing your browser cache, 4) Check if our service status page shows any issues, 5) If the problem persists, contact support@law-gpt.app with details."
                },
                {
                    q: "I forgot my password. How do I reset it?",
                    a: "Click 'Forgot Password' on the login page, enter your registered email, and you'll receive a password reset link. Follow the instructions in the email to create a new password."
                },
                {
                    q: "My chat history disappeared. Can I recover it?",
                    a: "If you were logged in when chatting, your history is saved and should reappear when you log back in. If you were using the service without an account, chat history is not saved. Create an account to preserve your conversations."
                },
                {
                    q: "The answer seems incomplete or incorrect. What should I do?",
                    a: "1) Try rephrasing your question with more specific details, 2) Check if the AI cited sources - verify with those, 3) Report the issue to support@law-gpt.app with the question and response, 4) Always consult official legal sources or attorneys for critical matters."
                }
            ]
        }
    ];

    const toggleQuestion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const filteredFAQ = faqData.map(category => ({
        ...category,
        questions: category.questions.filter(item =>
            item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.a.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(category => category.questions.length > 0);

    return (
        <div className="legal-page faq-page">
            <div className="legal-container">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} /> Back to Home
                </Link>

                <div className="legal-header">
                    <HelpCircle size={48} className="legal-icon" />
                    <h1>Frequently Asked Questions</h1>
                    <p className="legal-subtitle">Find answers to common questions about LawGPT</p>
                </div>

                {/* Search */}
                <div className="faq-search">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search questions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* FAQ Categories */}
                <div className="faq-content">
                    {filteredFAQ.length > 0 ? (
                        filteredFAQ.map((category, catIndex) => (
                            <div key={catIndex} className="faq-category">
                                <h2>{category.category}</h2>
                                <div className="faq-list">
                                    {category.questions.map((item, qIndex) => {
                                        const globalIndex = `${catIndex}-${qIndex}`;
                                        const isOpen = openIndex === globalIndex;
                                        
                                        return (
                                            <div
                                                key={qIndex}
                                                className={`faq-item ${isOpen ? 'open' : ''}`}
                                            >
                                                <button
                                                    className="faq-question"
                                                    onClick={() => toggleQuestion(globalIndex)}
                                                >
                                                    <span>{item.q}</span>
                                                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </button>
                                                {isOpen && (
                                                    <div className="faq-answer">
                                                        <p>{item.a}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-results">
                            <p>No questions found matching "{searchTerm}"</p>
                            <button onClick={() => setSearchTerm('')} className="btn btn-primary">
                                Clear Search
                            </button>
                        </div>
                    )}
                </div>

                {/* Still have questions */}
                <div className="faq-cta">
                    <h3>Still have questions?</h3>
                    <p>Can't find what you're looking for? Contact our support team.</p>
                    <Link to="/contact" className="btn btn-primary">
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default FAQ;
