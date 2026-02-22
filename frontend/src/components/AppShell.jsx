/**
 * AppShell — Authenticated Application Layout
 *
 * Provides persistent sidebar navigation + content area.
 * On the /chat route the sidebar collapses to an icon rail (64px)
 * so the Chat page can use its own session-history panel.
 */

import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Scale } from 'lucide-react';
import Sidebar from './Sidebar';
import '../styles/appshell.css';

function AppShell({ user, onLogout }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compact sidebar when user is on the chat page (including nested routes)
  const isChat = location.pathname.startsWith('/chat');

  return (
    <div className={`app-shell ${isChat ? 'shell-chat' : ''}`}>
      <Sidebar user={user} onLogout={onLogout} compact={isChat} mobileMenuOpen={mobileMenuOpen} />

      {/* Mobile top-bar (visible ≤ 768px) */}
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu size={22} />
        </button>
        <div className="mobile-brand">
          <div className="mobile-brand-icon"><Scale size={16} /></div>
          <span>LawGPT</span>
        </div>
      </div>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
