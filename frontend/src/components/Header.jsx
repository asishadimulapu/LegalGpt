/**
 * Header/Navbar Component with Smooth Scroll Navigation
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Scale, Menu, X, LogOut, User, MessageCircle } from 'lucide-react';
import '../styles/header.css';

function Header({ onAuthClick, user, onLogout }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    // Handle navigation - scroll to section or navigate
    const handleNavClick = (e, sectionId) => {
        e.preventDefault();
        setMobileMenuOpen(false);

        // If on landing page, scroll to section
        if (location.pathname === '/') {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            // Navigate to home and then scroll
            navigate('/');
            setTimeout(() => {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    };

    const navLinks = [
        { id: 'features', label: 'Features' },
        { id: 'how-it-works', label: 'How It Works' },
        { id: 'your-rights', label: 'Your Rights' },
        { path: '/about', label: 'About' },
    ];

    return (
        <header className="header">
            <div className="header-container">
                {/* Logo */}
                <Link to="/" className="logo">
                    <div className="logo-icon">
                        <Scale size={22} />
                    </div>
                    <span className="logo-text">LawGPT</span>
                </Link>

                {/* Navigation */}
                <nav className={`nav ${mobileMenuOpen ? 'open' : ''}`}>
                    {navLinks.map((link) => (
                        link.path ? (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ) : (
                            <a
                                key={link.id}
                                href={`#${link.id}`}
                                className="nav-link"
                                onClick={(e) => handleNavClick(e, link.id)}
                            >
                                {link.label}
                            </a>
                        )
                    ))}
                </nav>

                {/* Auth Buttons */}
                <div className="auth-buttons">
                    {user ? (
                        <>
                            <Link to="/chat" className="btn-chat">
                                <MessageCircle size={16} /> Chat
                            </Link>
                            <span className="user-email">
                                <User size={16} /> {user.email}
                            </span>
                            <button className="btn-signin" onClick={onLogout}>
                                <LogOut size={16} /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/chat" className="btn-chat">
                                <MessageCircle size={16} /> Try Chat
                            </Link>
                            <button className="btn-signin" onClick={() => onAuthClick('signin')}>
                                Sign In
                            </button>
                            <button className="btn-getstarted" onClick={() => onAuthClick('register')}>
                                Get Started
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </header>
    );
}

export default Header;
