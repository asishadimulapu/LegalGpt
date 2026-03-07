/**
 * Sidebar Navigation — App Shell
 *
 * Full mode (250px): logo + text labels + user card  → non-chat pages
 * Compact mode (64px): icon-only rail               → chat page
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Scale,
  MessageCircle,
  Shield,
  User,
  CircleUser,
  FileText,
  Lock,
  AlertCircle,
  LogOut,
  ChevronDown,
  Info,
  HelpCircle,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/sidebar.css';

const NAV_ITEMS = [
  { path: '/chat', label: 'Chat', icon: MessageCircle },
  { path: '/rights', label: 'Your Rights', icon: Shield },
  { path: '/profile', label: 'Profile', icon: CircleUser },
];

const LEGAL_LINKS = [
  { path: '/about', label: 'About', icon: Info },
  { path: '/terms', label: 'Terms', icon: FileText },
  { path: '/privacy', label: 'Privacy', icon: Lock },
  { path: '/disclaimer', label: 'Disclaimer', icon: AlertCircle },
];

function Sidebar({ compact = false, mobileMenuOpen = false }) {
  const { user, logout: onLogout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <aside className={`app-sidebar ${compact ? 'compact' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      {/* ── Brand ────────────────────────────────── */}
      <div className="sidebar-brand">
        <Link to="/chat" className="brand-link">
          <div className="brand-icon"><Scale size={20} /></div>
          {!compact && <span className="brand-text">LawGPT</span>}
        </Link>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="sidebar-nav">
        <div className="nav-group">
          {!compact && <span className="nav-group-label">Main</span>}
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`sidebar-link ${location.pathname === path ? 'active' : ''}`}
              title={compact ? label : undefined}
            >
              <Icon size={18} />
              {!compact && <span>{label}</span>}
            </Link>
          ))}
        </div>

        <div className="nav-group">
          {!compact && <span className="nav-group-label">Legal</span>}
          {LEGAL_LINKS.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`sidebar-link ${location.pathname === path ? 'active' : ''}`}
              title={compact ? label : undefined}
            >
              <Icon size={18} />
              {!compact && <span>{label}</span>}
            </Link>
          ))}
        </div>

        {/* Admin link — only for superusers */}
        {user?.is_superuser && (
          <div className="nav-group">
            {!compact && <span className="nav-group-label">Admin</span>}
            <Link
              to="/admin"
              className={`sidebar-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              title={compact ? 'Admin Dashboard' : undefined}
            >
              <Settings size={18} />
              {!compact && <span>Admin Dashboard</span>}
            </Link>
          </div>
        )}
      </nav>

      {/* ── User Card + Dropdown ─────────────────── */}
      <div className="sidebar-user" ref={dropdownRef}>
        {compact ? (
          <button
            className="sidebar-link user-toggle"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title={user?.email}
          >
            <User size={18} />
          </button>
        ) : (
          <button className="user-card" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="user-avatar"><User size={16} /></div>
            <div className="user-meta">
              <span className="user-display-name">{displayName}</span>
              <span className="user-email-text">{user?.email}</span>
            </div>
            <ChevronDown size={14} className={`chevron ${dropdownOpen ? 'open' : ''}`} />
          </button>
        )}

        {dropdownOpen && (
          <div className={`user-dropdown ${compact ? 'dropdown-side' : ''}`}>
            <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
              <CircleUser size={14} /> Profile
            </Link>
            <Link to="/terms" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
              <FileText size={14} /> Terms of Service
            </Link>
            <Link to="/privacy" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
              <Lock size={14} /> Privacy Policy
            </Link>
            <Link to="/about" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
              <Info size={14} /> About LawGPT
            </Link>
            <Link to="/contact" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
              <HelpCircle size={14} /> Help / Support
            </Link>
            <div className="dropdown-divider" />
            <button className="dropdown-item danger" onClick={onLogout}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
