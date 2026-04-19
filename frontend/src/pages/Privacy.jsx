/**
 * Privacy Policy Page - LawGPT
 * Comprehensive privacy policy for AdSense compliance
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Cookie, UserX } from 'lucide-react';
import { LegalPageSkeleton } from '../components/SkeletonLoader';
import '../styles/legal.css';

function Privacy() {
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { const t = setTimeout(() => setIsLoading(false), 350); return () => clearTimeout(t); }, []);
    if (isLoading) return <LegalPageSkeleton />;
    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} /> Back to Home
                </Link>

                <div className="legal-header">
                    <Shield size={48} className="legal-icon" />
                    <h1>Privacy Policy</h1>
                    <p className="legal-date">Last Updated: January 29, 2026</p>
                </div>

                <div className="legal-content">
                    <section className="legal-section">
                        <h2><Eye size={24} /> Introduction</h2>
                        <p>
                            Welcome to LawGPT ("we," "our," or "us"). We are committed to protecting your privacy 
                            and handling your personal information with care. This Privacy Policy explains how we collect, 
                            use, disclose, and safeguard your information when you visit our website and use our AI-powered 
                            legal information service.
                        </p>
                        <p>
                            By accessing or using LawGPT, you agree to this Privacy Policy. If you do not agree with 
                            our policies and practices, please do not use our service.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2><Database size={24} /> Information We Collect</h2>
                        
                        <h3>Personal Information You Provide</h3>
                        <ul>
                            <li><strong>Account Information:</strong> When you create an account, we collect your email address, username, and password (encrypted).</li>
                            <li><strong>Chat Queries:</strong> Your legal questions and the responses provided by our AI assistant.</li>
                            <li><strong>Uploaded Documents:</strong> Any documents you upload for analysis (if applicable).</li>
                            <li><strong>Communication:</strong> Information you provide when contacting us for support.</li>
                        </ul>

                        <h3>Information Collected Automatically</h3>
                        <ul>
                            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on pages, and interaction patterns.</li>
                            <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
                            <li><strong>Cookies and Tracking:</strong> We use cookies and similar technologies (see Cookie Policy below).</li>
                            <li><strong>Log Data:</strong> Server logs including IP addresses, access times, and error logs.</li>
                        </ul>

                        <h3>Third-Party Analytics</h3>
                        <p>
                            We use third-party analytics services (such as Google Analytics) to understand how users 
                            interact with our service and improve user experience.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2><Lock size={24} /> How We Use Your Information</h2>
                        
                        <p>We use the information we collect for the following purposes:</p>
                        
                        <div className="info-grid">
                            <div className="info-item">
                                <h4>Service Delivery</h4>
                                <p>To provide, maintain, and improve our AI legal assistant service.</p>
                            </div>
                            <div className="info-item">
                                <h4>Personalization</h4>
                                <p>To personalize your experience and save your chat history.</p>
                            </div>
                            <div className="info-item">
                                <h4>Communication</h4>
                                <p>To respond to your inquiries and send service-related notifications.</p>
                            </div>
                            <div className="info-item">
                                <h4>Analytics</h4>
                                <p>To analyze usage patterns and improve our service quality.</p>
                            </div>
                            <div className="info-item">
                                <h4>Security</h4>
                                <p>To detect, prevent, and address technical issues and security threats.</p>
                            </div>
                            <div className="info-item">
                                <h4>Legal Compliance</h4>
                                <p>To comply with legal obligations and protect our legal rights.</p>
                            </div>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2><Cookie size={24} /> Cookies and Tracking Technologies</h2>
                        
                        <p>We use cookies and similar tracking technologies to track activity on our service. Types of cookies we use:</p>
                        
                        <ul>
                            <li><strong>Essential Cookies:</strong> Required for the website to function properly (authentication, security).</li>
                            <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website.</li>
                            <li><strong>Preference Cookies:</strong> Remember your settings and preferences.</li>
                            <li><strong>Advertising Cookies:</strong> Used by third-party advertisers (including Google AdSense) to serve relevant ads.</li>
                        </ul>

                        <div className="notice-box">
                            <p><strong>Google AdSense:</strong> We use Google AdSense to display advertisements. Google uses cookies to serve ads based on your prior visits to our website or other websites. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</p>
                        </div>

                        <p>You can control cookies through your browser settings. However, disabling cookies may limit your ability to use certain features.</p>
                    </section>

                    <section className="legal-section">
                        <h2><Shield size={24} /> Data Security</h2>
                        
                        <p>We implement appropriate technical and organizational measures to protect your personal information:</p>
                        
                        <ul>
                            <li>Encryption of sensitive data in transit (HTTPS/TLS)</li>
                            <li>Encrypted password storage using industry-standard hashing</li>
                            <li>Secure database access controls</li>
                            <li>Regular security audits and monitoring</li>
                            <li>Limited employee access to personal data</li>
                        </ul>

                        <p>
                            However, no method of transmission over the Internet or electronic storage is 100% secure. 
                            While we strive to use commercially acceptable means to protect your information, we cannot 
                            guarantee its absolute security.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2><UserX size={24} /> Data Retention and Deletion</h2>
                        
                        <p>
                            We retain your personal information only for as long as necessary to fulfill the purposes 
                            outlined in this Privacy Policy, unless a longer retention period is required by law.
                        </p>

                        <ul>
                            <li><strong>Chat History:</strong> Stored indefinitely or until you delete your account.</li>
                            <li><strong>Account Data:</strong> Retained until account deletion requested.</li>
                            <li><strong>Analytics Data:</strong> Aggregated data retained for analytical purposes.</li>
                            <li><strong>Log Files:</strong> Typically retained for 90 days.</li>
                        </ul>

                        <p>
                            You have the right to request deletion of your personal data at any time by contacting us 
                            or deleting your account through the application.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Third-Party Services</h2>
                        
                        <p>Our service integrates with third-party services that may collect information:</p>
                        
                        <ul>
                            <li><strong>Google AdSense:</strong> For displaying advertisements (subject to Google's Privacy Policy)</li>
                            <li><strong>Google Analytics:</strong> For website analytics (subject to Google's Privacy Policy)</li>
                            <li><strong>Groq API:</strong> For AI language model processing (query data is processed)</li>
                            <li><strong>Cloud Hosting Provider:</strong> For infrastructure and data storage</li>
                        </ul>

                        <p>
                            These third parties have their own privacy policies. We encourage you to review them. 
                            We are not responsible for the privacy practices of these third parties.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Your Privacy Rights</h2>
                        
                        <p>Depending on your location, you may have the following rights:</p>
                        
                        <ul>
                            <li><strong>Access:</strong> Request a copy of your personal data.</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate data.</li>
                            <li><strong>Deletion:</strong> Request deletion of your personal data.</li>
                            <li><strong>Portability:</strong> Request transfer of your data to another service.</li>
                            <li><strong>Objection:</strong> Object to processing of your data for certain purposes.</li>
                            <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where consent was given.</li>
                        </ul>

                        <p>To exercise these rights, please contact us using the information provided below.</p>
                    </section>

                    <section className="legal-section">
                        <h2>Children's Privacy</h2>
                        
                        <p>
                            Our service is not intended for individuals under the age of 18. We do not knowingly collect 
                            personal information from children under 18. If you are a parent or guardian and believe your 
                            child has provided us with personal information, please contact us immediately.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>International Data Transfers</h2>
                        
                        <p>
                            Your information may be transferred to and maintained on servers located outside of your 
                            country where data protection laws may differ. By using our service, you consent to such transfers.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Changes to This Privacy Policy</h2>
                        
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any changes by 
                            posting the new Privacy Policy on this page and updating the "Last Updated" date.
                        </p>
                        
                        <p>
                            You are advised to review this Privacy Policy periodically for any changes. Changes to this 
                            Privacy Policy are effective when they are posted on this page.
                        </p>
                    </section>

                    <section className="legal-section contact-section">
                        <h2>Contact Us</h2>
                        
                        <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
                        
                        <div className="contact-info">
                            <p><strong>Email:</strong> privacy@law-gpt.app</p>
                            <p><strong>Email (General):</strong> support@law-gpt.app</p>
                            <p><strong>Website:</strong> www.law-gpt.app</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Privacy;
