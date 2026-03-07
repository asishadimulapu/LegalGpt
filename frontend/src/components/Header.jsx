/**
 * Header/Navbar - Auth-Aware SaaS Navigation
 *
 * Logged OUT: Logo | Features | How It Works | About | [Sign In] [Get Started]
 * Logged IN:  Logo | Chat | Profile | About | user@email | [Logout]
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Scale, Menu, X, LogOut, User, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/header.css';

function Header() {
    const { user, isAuthenticated, openAuth: onAuthClick, logout: onLogout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    // Handle smooth-scroll for landing page sections
    const handleSectionClick = (e, sectionId) => {
        e.preventDefault();
        setMobileMenuOpen(false);
        if (location.pathname === '/') {
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            navigate('/');
            setTimeout(() => {
                document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    // ── Navigation links based on auth state ────────────────
    const guestLinks = [
        { id: 'features', label: 'Features' },
        { id: 'how-it-works', label: 'How It Works' },
        { path: '/about', label: 'About' },
    ];

    const authLinks = [
        { path: '/chat', label: 'Chat', icon: MessageCircle },
        { path: '/profile', label: 'Profile', icon: User },
        { path: '/about', label: 'About' },
    ];

    const navLinks = isAuthenticated ? authLinks : guestLinks;

    return (
        <header className="header">
            <div className="header-container">
                {/* Logo */}
                <Link to={isAuthenticated ? '/chat' : '/'} className="logo">
                    <div className="logo-icon"><Scale size={22} /></div>
                    <span className="logo-text">LawGPT</span>
                </Link>

                {/* Navigation */}
                <nav className={`nav ${mobileMenuOpen ? 'open' : ''}`}>
                    {navLinks.map((link) =>
                        link.path ? (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.icon && <link.icon size={15} />}
                                {link.label}
                            </Link>
                        ) : (
                            <a
                                key={link.id}
                                href={`#${link.id}`}
                                className="nav-link"
                                onClick={(e) => handleSectionClick(e, link.id)}
                            >
                                {link.label}
                            </a>
                        )
                    )}
                </nav>

                {/* Right-side actions */}
                <div className="header-actions">
                    {isAuthenticated ? (
                        <>
                            <span className="user-email" title={user?.email ?? 'Unknown'}>
                                <User size={14} />
                                <span className="email-text">{user?.email ?? 'Unknown'}</span>
                            </span>
                            <button className="btn-logout" onClick={onLogout}>
                                <LogOut size={15} /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn-signin" onClick={() => onAuthClick('signin')}>
                                Sign In
                            </button>
                            <button className="btn-getstarted" onClick={() => onAuthClick('register')}>
                                Get Started
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile toggle */}
                <button
                    className="mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </header>
    );
}

export default Header;
