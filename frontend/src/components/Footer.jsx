/**
 * Footer Component - NyayaSahay Design with Lucide Icons
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, Mail, Phone, MapPin, Shield } from 'lucide-react';
import '../styles/footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-grid">
                    {/* Brand */}
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <span className="footer-logo-icon">
                                <Scale size={20} />
                            </span>
                            <span className="footer-logo-text">LawGPT</span>
                        </div>
                        <p className="footer-tagline">
                            Empowering Indian citizens with AI-powered legal awareness.
                            Know your rights, protect your future.
                        </p>
                        <div className="footer-secure">
                            <Shield size={16} /> 100% Secure & Confidential
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="footer-links">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><Link to="/about">About Us</Link></li>
                            <li><Link to="/chat">Start Chat</Link></li>
                            <li><Link to="/faq">FAQs</Link></li>
                            <li><Link to="/contact">Contact Us</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="footer-links">
                        <h4>Legal</h4>
                        <ul>
                            <li><Link to="/privacy">Privacy Policy</Link></li>
                            <li><Link to="/terms">Terms of Service</Link></li>
                            <li><Link to="/disclaimer">Disclaimer</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="footer-links">
                        <h4>Get in Touch</h4>
                        <ul className="footer-contact">
                            <li>
                                <Mail size={16} />
                                <a href="mailto:support@law-gpt.app">support@law-gpt.app</a>
                            </li>
                            <li>
                                <Mail size={16} />
                                <a href="mailto:legal@law-gpt.app">legal@law-gpt.app</a>
                            </li>
                            <li>
                                <MapPin size={16} />
                                <span>India</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="footer-disclaimer">
                    <p>
                        <strong>Disclaimer:</strong> NyayaSahay provides legal information for educational
                        purposes only and does not constitute legal advice. For specific legal matters,
                        please consult a qualified legal professional. The information provided is based
                        on Indian law and may not be applicable in all situations.
                    </p>
                </div>

                {/* Bottom Bar */}
                <div className="footer-bottom">
                    <p>© 2026 LawGPT. All rights reserved.</p>
                    <div className="footer-bottom-links">
                        <Link to="/privacy">Privacy</Link>
                        <Link to="/terms">Terms</Link>
                        <Link to="/contact">Contact</Link>
                        <Link to="/faq">FAQ</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
