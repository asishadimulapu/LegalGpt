/**
 * Contact Page - LawGPT
 * Contact information and support details
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, MapPin, Phone, Clock, Send, CheckCircle } from 'lucide-react';
import '../styles/legal.css';

function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const submitTimeoutRef = useRef(null);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (submitTimeoutRef.current) {
                clearTimeout(submitTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);

        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${API_URL}/api/v1/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to send message. Please try again.');
            }

            setSubmitted(true);

            // Clear any existing timeout before creating a new one
            if (submitTimeoutRef.current) {
                clearTimeout(submitTimeoutRef.current);
            }

            submitTimeoutRef.current = setTimeout(() => {
                setSubmitted(false);
                setFormData({ name: '', email: '', subject: '', message: '' });
            }, 5000);
        } catch (err) {
            setSubmitError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="legal-page contact-page">
            <div className="legal-container">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} /> Back to Home
                </Link>

                <div className="legal-header">
                    <Mail size={48} className="legal-icon" />
                    <h1>Contact Us</h1>
                    <p className="legal-subtitle">We're here to help with any questions or concerns</p>
                </div>

                <div className="contact-grid">
                    {/* Contact Information */}
                    <div className="contact-info-section">
                        <h2>Get in Touch</h2>
                        <p>Have questions about our service? Need technical support? Want to provide feedback? We'd love to hear from you.</p>

                        <div className="contact-methods">
                            <div className="contact-method">
                                <div className="method-icon">
                                    <Mail size={24} />
                                </div>
                                <div className="method-details">
                                    <h3>Email Support</h3>
                                    <p><a href="mailto:support@law-gpt.app">support@law-gpt.app</a></p>
                                    <span className="response-time">Response within 24-48 hours</span>
                                </div>
                            </div>

                            <div className="contact-method">
                                <div className="method-icon">
                                    <Mail size={24} />
                                </div>
                                <div className="method-details">
                                    <h3>Legal Inquiries</h3>
                                    <p><a href="mailto:legal@law-gpt.app">legal@law-gpt.app</a></p>
                                    <span className="response-time">For legal concerns and compliance</span>
                                </div>
                            </div>

                            <div className="contact-method">
                                <div className="method-icon">
                                    <Mail size={24} />
                                </div>
                                <div className="method-details">
                                    <h3>Privacy Concerns</h3>
                                    <p><a href="mailto:privacy@law-gpt.app">privacy@law-gpt.app</a></p>
                                    <span className="response-time">Data protection and privacy matters</span>
                                </div>
                            </div>

                            <div className="contact-method">
                                <div className="method-icon">
                                    <MessageCircle size={24} />
                                </div>
                                <div className="method-details">
                                    <h3>Live Chat</h3>
                                    <p>Use our AI assistant for instant help</p>
                                    <Link to="/chat" className="chat-link">Start Chat →</Link>
                                </div>
                            </div>

                            <div className="contact-method">
                                <div className="method-icon">
                                    <Clock size={24} />
                                </div>
                                <div className="method-details">
                                    <h3>Support Hours</h3>
                                    <p>Monday - Friday: 9:00 AM - 6:00 PM IST</p>
                                    <span className="response-time">AI Assistant available 24/7</span>
                                </div>
                            </div>

                            <div className="contact-method">
                                <div className="method-icon">
                                    <MapPin size={24} />
                                </div>
                                <div className="method-details">
                                    <h3>Location</h3>
                                    <p>India</p>
                                    <span className="response-time">Serving users nationwide</span>
                                </div>
                            </div>
                        </div>

                        <div className="business-info">
                            <h3>Business Information</h3>
                            <p><strong>Service Name:</strong> LawGPT</p>
                            <p><strong>Website:</strong> <a href="https://law-gpt.app">law-gpt.app</a></p>
                            <p><strong>Service Type:</strong> AI-Powered Legal Information Platform</p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="contact-form-section">
                        <div className="form-card">
                            <h2>Send us a Message</h2>
                            <p>Fill out the form below and we'll get back to you as soon as possible.</p>

                            {submitted ? (
                                <div className="success-message">
                                    <CheckCircle size={48} />
                                    <h3>Message Sent!</h3>
                                    <p>Thank you for contacting us. We'll respond to your inquiry within 24-48 hours.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="contact-form">
                                    <div className="form-group">
                                        <label htmlFor="name">Full Name *</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            placeholder="Enter your full name"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="email">Email Address *</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            placeholder="your.email@example.com"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="subject">Subject *</label>
                                        <select
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select a subject</option>
                                            <option value="general">General Inquiry</option>
                                            <option value="technical">Technical Support</option>
                                            <option value="feedback">Feedback</option>
                                            <option value="privacy">Privacy Concern</option>
                                            <option value="legal">Legal Matter</option>
                                            <option value="partnership">Partnership/Business</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="message">Message *</label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows="6"
                                            placeholder="Tell us how we can help you..."
                                        ></textarea>
                                    </div>

                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? (
                                            <><span className="spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite', marginRight: 8 }} /> Sending...</>
                                        ) : (
                                            <><Send size={20} /> Send Message</>
                                        )}
                                    </button>

                                    {submitError && (
                                        <p style={{ color: '#e74c3c', marginTop: 8, fontSize: 14 }}>{submitError}</p>
                                    )}

                                    <p className="form-note">
                                        * Required fields. By submitting this form, you agree to our 
                                        <Link to="/privacy"> Privacy Policy</Link>.
                                    </p>
                                </form>
                            )}
                        </div>

                        <div className="faq-quick">
                            <h3>Quick Answers</h3>
                            <div className="faq-item">
                                <strong>Is this service free?</strong>
                                <p>Yes, LawGPT is completely free to use. You can ask unlimited questions.</p>
                            </div>
                            <div className="faq-item">
                                <strong>Do you provide legal advice?</strong>
                                <p>No, we provide legal information only. Always consult a qualified attorney for legal advice.</p>
                            </div>
                            <div className="faq-item">
                                <strong>How do I delete my data?</strong>
                                <p>You can delete your account and data anytime through your account settings or by contacting us at privacy@law-gpt.app</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Contact;
