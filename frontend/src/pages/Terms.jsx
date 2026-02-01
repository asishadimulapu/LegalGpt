/**
 * Terms of Service Page - LawGPT
 * Legal terms and conditions for using the service
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import '../styles/legal.css';

function Terms() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} /> Back to Home
                </Link>

                <div className="legal-header">
                    <FileText size={48} className="legal-icon" />
                    <h1>Terms of Service</h1>
                    <p className="legal-date">Last Updated: January 29, 2026</p>
                </div>

                <div className="legal-content">
                    <section className="legal-section">
                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            Welcome to LawGPT. By accessing or using our website and services, you agree to be 
                            bound by these Terms of Service ("Terms"), our Privacy Policy, and all applicable laws 
                            and regulations. If you do not agree with any of these terms, you are prohibited from 
                            using or accessing this site.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>2. Description of Service</h2>
                        <p>
                            LawGPT is an AI-powered legal information platform that provides:
                        </p>
                        <ul>
                            <li>Access to legal information from Indian statutes (IPC, CrPC, Constitution, etc.)</li>
                            <li>AI-assisted answers to legal queries using Retrieval-Augmented Generation (RAG)</li>
                            <li>Educational content about legal rights and procedures</li>
                            <li>Legal document analysis capabilities</li>
                        </ul>

                        <div className="important-notice">
                            <AlertTriangle size={24} />
                            <div>
                                <h3>IMPORTANT: Not Legal Advice</h3>
                                <p>
                                    <strong>LawGPT provides legal information only, NOT legal advice.</strong> 
                                    The information provided through our service is for educational and informational 
                                    purposes only. It should not be construed as legal advice or a substitute for 
                                    consultation with a qualified attorney. Always consult a licensed legal professional 
                                    for advice specific to your situation.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2>3. User Accounts and Registration</h2>
                        
                        <h3>3.1 Account Creation</h3>
                        <p>
                            To access certain features, you may be required to create an account. You agree to:
                        </p>
                        <ul>
                            <li>Provide accurate, current, and complete information</li>
                            <li>Maintain and update your information</li>
                            <li>Keep your password secure and confidential</li>
                            <li>Accept responsibility for all activities under your account</li>
                            <li>Notify us immediately of any unauthorized use</li>
                        </ul>

                        <h3>3.2 Eligibility</h3>
                        <p>
                            You must be at least 18 years old to use this service. By using LawGPT, you represent 
                            and warrant that you are of legal age to form a binding contract.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>4. User Conduct and Prohibited Uses</h2>
                        
                        <p>You agree NOT to use the service to:</p>
                        
                        <div className="prohibited-list">
                            <div className="prohibited-item">
                                <XCircle size={20} />
                                <div>
                                    <strong>Illegal Activities:</strong> Engage in any unlawful purpose or violate any laws
                                </div>
                            </div>
                            <div className="prohibited-item">
                                <XCircle size={20} />
                                <div>
                                    <strong>Misrepresentation:</strong> Impersonate any person or entity or falsely state affiliation
                                </div>
                            </div>
                            <div className="prohibited-item">
                                <XCircle size={20} />
                                <div>
                                    <strong>Harmful Content:</strong> Upload or transmit viruses, malware, or malicious code
                                </div>
                            </div>
                            <div className="prohibited-item">
                                <XCircle size={20} />
                                <div>
                                    <strong>System Interference:</strong> Attempt to gain unauthorized access or disrupt service
                                </div>
                            </div>
                            <div className="prohibited-item">
                                <XCircle size={20} />
                                <div>
                                    <strong>Data Mining:</strong> Use automated systems to scrape or extract data
                                </div>
                            </div>
                            <div className="prohibited-item">
                                <XCircle size={20} />
                                <div>
                                    <strong>Commercial Use:</strong> Use the service for unauthorized commercial purposes
                                </div>
                            </div>
                            <div className="prohibited-item">
                                <XCircle size={20} />
                                <div>
                                    <strong>Abuse:</strong> Harass, threaten, or harm other users or our staff
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2>5. Intellectual Property Rights</h2>
                        
                        <h3>5.1 Our Content</h3>
                        <p>
                            The service and its original content, features, and functionality are owned by LawGPT 
                            and are protected by international copyright, trademark, patent, trade secret, and other 
                            intellectual property laws.
                        </p>

                        <h3>5.2 Your Content</h3>
                        <p>
                            You retain ownership of any content you submit, post, or display on the service ("User Content"). 
                            By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to 
                            use, reproduce, and process your content solely for the purpose of providing the service.
                        </p>

                        <h3>5.3 Legal Documents</h3>
                        <p>
                            Legal statutes and case law in our database are public domain documents. Our organization, 
                            presentation, and AI-generated analysis of these documents are proprietary.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>6. Disclaimer of Warranties</h2>
                        
                        <div className="warranty-box">
                            <p>
                                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES 
                                OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                            </p>
                            <ul>
                                <li>Warranties of merchantability or fitness for a particular purpose</li>
                                <li>Warranties that the service will be uninterrupted or error-free</li>
                                <li>Warranties regarding the accuracy, reliability, or completeness of information</li>
                                <li>Warranties that defects will be corrected</li>
                            </ul>
                        </div>

                        <p>
                            <strong>AI Limitations:</strong> Our AI assistant may occasionally produce inaccurate 
                            or incomplete information. We make no guarantee regarding the accuracy of AI-generated responses. 
                            Always verify critical legal information with official sources or legal professionals.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>7. Limitation of Liability</h2>
                        
                        <p>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, LAWGPT SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, 
                            WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER 
                            INTANGIBLE LOSSES RESULTING FROM:
                        </p>
                        <ul>
                            <li>Your use or inability to use the service</li>
                            <li>Any conduct or content of any third party on the service</li>
                            <li>Any content obtained from the service</li>
                            <li>Unauthorized access, use, or alteration of your transmissions or content</li>
                            <li>Reliance on information provided through the service</li>
                        </ul>

                        <p>
                            <strong>Legal Decisions:</strong> You acknowledge that any legal decision made based on 
                            information from our service is made at your own risk. We are not responsible for the 
                            outcomes of any legal matters.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>8. Indemnification</h2>
                        
                        <p>
                            You agree to indemnify, defend, and hold harmless LawGPT, its officers, directors, 
                            employees, and agents from any claims, liabilities, damages, losses, and expenses, including 
                            reasonable attorneys' fees, arising out of or in any way connected with:
                        </p>
                        <ul>
                            <li>Your access to or use of the service</li>
                            <li>Your violation of these Terms</li>
                            <li>Your violation of any third-party rights</li>
                            <li>Any User Content you submit or transmit</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2>9. Third-Party Services and Advertising</h2>
                        
                        <h3>9.1 Google AdSense</h3>
                        <p>
                            We use Google AdSense to display advertisements on our website. Google may use cookies 
                            to serve ads based on your prior visits to our website or other websites. These ads are 
                            governed by Google's advertising policies and privacy practices.
                        </p>

                        <h3>9.2 Third-Party Links</h3>
                        <p>
                            Our service may contain links to third-party websites or services that are not owned or 
                            controlled by LawGPT. We have no control over and assume no responsibility for the 
                            content, privacy policies, or practices of any third-party sites or services.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>10. Data and Privacy</h2>
                        
                        <p>
                            Your use of the service is also governed by our Privacy Policy. Please review our 
                            Privacy Policy to understand how we collect, use, and protect your information.
                        </p>

                        <div className="privacy-highlights">
                            <div className="privacy-item">
                                <CheckCircle size={20} />
                                <span>Chat queries are stored securely and encrypted</span>
                            </div>
                            <div className="privacy-item">
                                <CheckCircle size={20} />
                                <span>You can delete your data at any time</span>
                            </div>
                            <div className="privacy-item">
                                <CheckCircle size={20} />
                                <span>We never share your queries with third parties</span>
                            </div>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2>11. Termination</h2>
                        
                        <p>
                            We reserve the right to terminate or suspend your account and access to the service 
                            immediately, without prior notice or liability, for any reason, including:
                        </p>
                        <ul>
                            <li>Breach of these Terms</li>
                            <li>Violation of applicable laws</li>
                            <li>Fraudulent, abusive, or illegal activity</li>
                            <li>At our sole discretion</li>
                        </ul>

                        <p>
                            Upon termination, your right to use the service will immediately cease. You may delete 
                            your account at any time through the application settings.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>12. Modifications to Service</h2>
                        
                        <p>
                            We reserve the right to modify or discontinue, temporarily or permanently, the service 
                            (or any part thereof) with or without notice. We shall not be liable to you or any third 
                            party for any modification, suspension, or discontinuance of the service.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>13. Changes to Terms</h2>
                        
                        <p>
                            We reserve the right to modify or replace these Terms at any time. If a revision is material, 
                            we will provide at least 30 days' notice prior to any new terms taking effect. Material 
                            changes will be notified via email or prominent notice on our website.
                        </p>
                        
                        <p>
                            Your continued use of the service after changes become effective constitutes acceptance 
                            of the new Terms.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>14. Governing Law and Jurisdiction</h2>
                        
                        <p>
                            These Terms shall be governed by and construed in accordance with the laws of India, 
                            without regard to its conflict of law provisions. Any legal action or proceeding arising 
                            under these Terms will be brought exclusively in the courts of New Delhi, India, 
                            and you consent to personal jurisdiction in such courts.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>15. Severability</h2>
                        
                        <p>
                            If any provision of these Terms is held to be unenforceable or invalid, such provision 
                            will be changed and interpreted to accomplish the objectives of such provision to the 
                            greatest extent possible under applicable law, and the remaining provisions will continue 
                            in full force and effect.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>16. Entire Agreement</h2>
                        
                        <p>
                            These Terms, together with our Privacy Policy and any other legal notices published by 
                            us on the service, constitute the entire agreement between you and LawGPT concerning 
                            the service.
                        </p>
                    </section>

                    <section className="legal-section contact-section">
                        <h2>17. Contact Information</h2>
                        
                        <p>
                            If you have any questions about these Terms of Service, please contact us:
                        </p>
                        
                        <div className="contact-info">
                            <p><strong>Email:</strong> legal@law-gpt.app</p>
                            <p><strong>Support:</strong> support@law-gpt.app</p>
                            <p><strong>Website:</strong> www.law-gpt.app</p>
                        </div>
                    </section>

                    <div className="acknowledgment-box">
                        <h3>Acknowledgment</h3>
                        <p>
                            BY USING LAWGPT, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND 
                            AGREE TO BE BOUND BY THEM.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Terms;
