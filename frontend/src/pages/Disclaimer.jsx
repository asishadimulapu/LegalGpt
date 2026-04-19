/**
 * Disclaimer Page - LawGPT
 * Important legal disclaimer about the service
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Shield, Scale } from 'lucide-react';
import { LegalPageSkeleton } from '../components/SkeletonLoader';
import '../styles/legal.css';

function Disclaimer() {
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { const t = setTimeout(() => setIsLoading(false), 1200); return () => clearTimeout(t); }, []);
    if (isLoading) return <LegalPageSkeleton />;
    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} /> Back to Home
                </Link>

                <div className="legal-header">
                    <AlertTriangle size={48} className="legal-icon" style={{ color: 'var(--accent-orange)' }} />
                    <h1>Legal Disclaimer</h1>
                    <p className="legal-date">Last Updated: January 29, 2026</p>
                </div>

                <div className="legal-content">
                    <div className="important-notice" style={{ marginTop: 0 }}>
                        <AlertTriangle size={32} />
                        <div>
                            <h2>IMPORTANT: This is Not Legal Advice</h2>
                            <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                                LawGPT provides <strong>legal information only</strong>. The information 
                                available through this service does NOT constitute legal advice and should NOT 
                                be treated as such.
                            </p>
                        </div>
                    </div>

                    <section className="legal-section">
                        <h2>Nature of Service</h2>
                        <p>
                            LawGPT is an AI-powered legal information platform designed to help users understand 
                            Indian law and legal concepts. Our service:
                        </p>
                        <ul>
                            <li><strong>Provides General Information:</strong> We offer general information about Indian statutes, legal procedures, and constitutional rights.</li>
                            <li><strong>Educational Purpose:</strong> All content is for educational and informational purposes only.</li>
                            <li><strong>Not Case-Specific:</strong> The information provided is not tailored to your specific legal situation.</li>
                            <li><strong>No Attorney-Client Relationship:</strong> Using this service does not create an attorney-client relationship.</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2><Shield size={24} /> What We Are NOT</h2>
                        
                        <div className="prohibited-list">
                            <div className="prohibited-item">
                                <AlertTriangle size={20} />
                                <div>
                                    <strong>We are NOT a law firm:</strong> LawGPT is not a law firm and does not provide legal services.
                                </div>
                            </div>
                            <div className="prohibited-item">
                                <AlertTriangle size={20} />
                                <div>
                                    <strong>We do NOT give legal advice:</strong> Our AI provides information, not advice on specific legal matters.
                                </div>
                            </div>
                            <div className="prohibited-item">
                                <AlertTriangle size={20} />
                                <div>
                                    <strong>We do NOT represent you:</strong> We do not represent clients in legal proceedings.
                                </div>
                            </div>
                            <div className="prohibited-item">
                                <AlertTriangle size={20} />
                                <div>
                                    <strong>We are NOT a substitute for lawyers:</strong> Nothing can replace consultation with a qualified attorney.
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2><Scale size={24} /> When to Consult a Real Lawyer</h2>
                        
                        <p>You should ALWAYS consult a qualified, licensed attorney if you:</p>
                        
                        <div className="info-grid">
                            <div className="info-item" style={{ borderColor: 'var(--accent-orange)' }}>
                                <h4>Face Legal Action</h4>
                                <p>Have been arrested, detained, or charged with a crime</p>
                            </div>
                            <div className="info-item" style={{ borderColor: 'var(--accent-orange)' }}>
                                <h4>Need Legal Representation</h4>
                                <p>Need to appear in court or file legal documents</p>
                            </div>
                            <div className="info-item" style={{ borderColor: 'var(--accent-orange)' }}>
                                <h4>Have a Specific Case</h4>
                                <p>Have a specific legal matter requiring professional advice</p>
                            </div>
                            <div className="info-item" style={{ borderColor: 'var(--accent-orange)' }}>
                                <h4>Sign Legal Documents</h4>
                                <p>Need to draft, review, or sign legal agreements</p>
                            </div>
                            <div className="info-item" style={{ borderColor: 'var(--accent-orange)' }}>
                                <h4>Complex Situations</h4>
                                <p>Deal with complex legal, financial, or family matters</p>
                            </div>
                            <div className="info-item" style={{ borderColor: 'var(--accent-orange)' }}>
                                <h4>Rights Violation</h4>
                                <p>Believe your legal rights have been violated</p>
                            </div>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2>Accuracy and Completeness</h2>
                        
                        <h3>No Guarantee of Accuracy</h3>
                        <p>
                            While we strive to provide accurate and up-to-date information, we make no warranties, 
                            express or implied, about the completeness, accuracy, reliability, suitability, or 
                            availability of the information provided.
                        </p>

                        <h3>AI Limitations</h3>
                        <p>
                            Our service uses AI technology which, despite advanced safeguards, may occasionally:
                        </p>
                        <ul>
                            <li>Provide incomplete information</li>
                            <li>Misinterpret complex legal questions</li>
                            <li>Fail to consider jurisdiction-specific variations</li>
                            <li>Miss recent legal changes or updates</li>
                        </ul>

                        <h3>Laws Change</h3>
                        <p>
                            Laws and legal procedures change frequently. Information that was accurate when provided 
                            may become outdated. Always verify current legal requirements with official sources or 
                            legal professionals.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>No Reliance</h2>
                        
                        <div className="warranty-box">
                            <p>
                                <strong>YOU SHOULD NOT RELY ON INFORMATION FROM LAWGPT TO MAKE LEGAL DECISIONS.</strong>
                            </p>
                            <p>
                                Any action you take based on information from this service is strictly at your own risk. 
                                We will not be liable for any losses or damages in connection with the use of our service.
                            </p>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2>Limitation of Liability</h2>
                        
                        <p>
                            To the fullest extent permitted by law, LawGPT and its operators, employees, and 
                            affiliates shall not be liable for any:
                        </p>
                        <ul>
                            <li>Decisions made based on information provided by our service</li>
                            <li>Legal consequences of actions taken or not taken</li>
                            <li>Financial losses or damages resulting from use of our service</li>
                            <li>Missed deadlines, statute of limitations, or procedural errors</li>
                            <li>Misunderstanding or misinterpretation of legal information</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2>Jurisdiction</h2>
                        
                        <p>
                            This service provides information primarily about <strong>Indian law</strong>. Legal 
                            systems vary by country, state, and jurisdiction. Information provided may not apply 
                            to your specific location or situation.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Emergency Situations</h2>
                        
                        <div className="important-notice">
                            <AlertTriangle size={24} />
                            <div>
                                <h3>In Case of Emergency</h3>
                                <p>
                                    If you are in immediate danger or facing an emergency legal situation:
                                </p>
                                <ul>
                                    <li><strong>Call Police:</strong> Dial 100 (emergency services)</li>
                                    <li><strong>Legal Aid:</strong> Call National Legal Services Authority at 15100</li>
                                    <li><strong>Women's Helpline:</strong> Dial 181</li>
                                    <li><strong>Child Helpline:</strong> Dial 1098</li>
                                </ul>
                                <p>
                                    <strong>DO NOT rely on our service for emergency situations. Seek immediate 
                                    professional help.</strong>
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2>Free Legal Aid Resources</h2>
                        
                        <p>If you cannot afford a lawyer, these organizations provide free legal aid in India:</p>
                        
                        <ul>
                            <li><strong>National Legal Services Authority (NALSA):</strong> Provides free legal aid to eligible persons</li>
                            <li><strong>State Legal Services Authorities:</strong> Available in every state</li>
                            <li><strong>District Legal Services Authorities:</strong> Available in every district</li>
                            <li><strong>Legal Aid Clinics:</strong> Run by law schools and NGOs</li>
                        </ul>

                        <p>
                            Visit <a href="https://nalsa.gov.in" target="_blank" rel="noopener noreferrer">nalsa.gov.in</a> 
                            {' '}to find free legal aid services near you.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>User Responsibility</h2>
                        
                        <p>By using LawGPT, you acknowledge and agree that:</p>
                        
                        <div className="privacy-highlights">
                            <div className="privacy-item" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                                <AlertTriangle size={20} style={{ color: 'var(--accent-orange)' }} />
                                <span>You understand this service provides information only, not legal advice</span>
                            </div>
                            <div className="privacy-item" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                                <AlertTriangle size={20} style={{ color: 'var(--accent-orange)' }} />
                                <span>You will verify critical information with official sources or lawyers</span>
                            </div>
                            <div className="privacy-item" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                                <AlertTriangle size={20} style={{ color: 'var(--accent-orange)' }} />
                                <span>You will not make legal decisions solely based on our information</span>
                            </div>
                            <div className="privacy-item" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                                <AlertTriangle size={20} style={{ color: 'var(--accent-orange)' }} />
                                <span>You accept full responsibility for any actions you take</span>
                            </div>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2>Updates to This Disclaimer</h2>
                        
                        <p>
                            We may update this disclaimer from time to time. Continued use of the service after 
                            changes constitutes acceptance of the updated disclaimer. Please review this page 
                            periodically.
                        </p>
                    </section>

                    <section className="legal-section contact-section">
                        <h2>Questions About This Disclaimer?</h2>
                        
                        <p>If you have questions about this disclaimer or our service, please contact us:</p>
                        
                        <div className="contact-info">
                            <p><strong>Email:</strong> legal@law-gpt.app</p>
                            <p><strong>Support:</strong> support@law-gpt.app</p>
                        </div>
                    </section>

                    <div className="acknowledgment-box" style={{ borderColor: 'var(--accent-orange)' }}>
                        <h3>Final Reminder</h3>
                        <p>
                            <strong>This service is for informational purposes only and should never be used as 
                            a substitute for professional legal counsel. When in doubt, always consult a qualified 
                            attorney licensed to practice law in your jurisdiction.</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Disclaimer;
