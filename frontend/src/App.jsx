/**
 * Main App — Dual-branch SaaS Routing
 *
 * Guest  → GuestLayout  (Header + page + Footer)
 * Auth   → AppShell     (Sidebar + page)
 */

import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from 'react-router-dom';

// Layout components
import Header from './components/Header';
import Footer from './components/Footer';
import AppShell from './components/AppShell';
import AuthModal from './components/AuthModal';

// Pages
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Disclaimer from './pages/Disclaimer';
import ProfileDashboard from './pages/ProfileDashboard';
import AuthCallback from './pages/AuthCallback';
import Rights from './pages/Rights';

// Admin pages
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import QueryAnalytics from './pages/admin/QueryAnalytics';

// Services
import { registerUser, loginUser, fetchCurrentUser } from './services/api';

/* ── Guest Layout (Header + Footer wrapper) ────────── */
function GuestLayout({ onAuthClick }) {
  return (
    <>
      <Header onAuthClick={onAuthClick} />
      <Outlet />
      <Footer />
    </>
  );
}

/* ── Root Layout ───────────────────────────────────── */
function AppLayout() {
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'signin' });
  const [user, setUser] = useState(() => {
    try {
      // Migrate from old key if needed
      const OLD_KEY = 'nyayasahay_user';
      const KEY = 'LawGPT_user';
      if (!localStorage.getItem(KEY) && localStorage.getItem(OLD_KEY)) {
        localStorage.setItem(KEY, localStorage.getItem(OLD_KEY));
        localStorage.removeItem(OLD_KEY);
      }
      const saved = localStorage.getItem(KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('LawGPT_user');
      return null;
    }
  });

  // Listen for session expiry events from api.js (e.g. 401 responses)
  React.useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      navigate('/');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [navigate]);

  const isAuthenticated = !!user;

  // ── Auth helpers ──────────────────────────────────
  const openAuth = (mode) => setAuthModal({ isOpen: true, mode });
  const closeAuth = () => setAuthModal({ isOpen: false, mode: 'signin' });
  const switchAuth = (mode) => setAuthModal({ isOpen: true, mode });

  const handleAuthSubmit = async (formData) => {
    try {
      if (authModal.mode === 'signin') {
        const res = await loginUser(formData.email, formData.password);
        const u = { email: formData.email, token: res.access_token };
        localStorage.setItem('LawGPT_user', JSON.stringify(u));
        // Fetch full profile to get is_superuser
        const profile = await fetchCurrentUser();
        if (profile) {
          u.is_superuser = profile.is_superuser;
          u.full_name = profile.full_name;
          localStorage.setItem('LawGPT_user', JSON.stringify(u));
        }
        setUser(u);
        closeAuth();
        navigate('/chat');
      } else {
        await registerUser(formData.name, formData.email, formData.password);
        const res = await loginUser(formData.email, formData.password);
        const u = { email: formData.email, name: formData.name, token: res.access_token };
        localStorage.setItem('LawGPT_user', JSON.stringify(u));
        const profile = await fetchCurrentUser();
        if (profile) {
          u.is_superuser = profile.is_superuser;
          u.full_name = profile.full_name;
          localStorage.setItem('LawGPT_user', JSON.stringify(u));
        }
        setUser(u);
        closeAuth();
        navigate('/chat');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('LawGPT_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('LawGPT_user');
    navigate('/');
  };

  const handleTryNow = () => navigate('/chat');

  // ── Routes ────────────────────────────────────────
  return (
    <>
      <Routes>
        {/* OAuth callback — outside any layout */}
        <Route path="/auth/callback" element={<AuthCallback onLoginSuccess={handleLoginSuccess} />} />

        {isAuthenticated ? (
          /* ═══ Authenticated ═══ */
          <>
            {/* Admin routes — standalone layout (no AppShell sidebar) */}
            <Route path="/admin" element={<AdminLayout user={user} />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="analytics" element={<QueryAnalytics />} />
            </Route>

            {/* Main app routes — inside AppShell */}
            <Route path="/" element={<AppShell user={user} onLogout={handleLogout} />}>
              <Route index element={<Navigate to="/chat" replace />} />
              <Route path="chat" element={<Chat user={user} onLogout={handleLogout} />} />
              <Route path="rights" element={<Rights />} />
              <Route path="profile" element={<ProfileDashboard user={user} onLogout={handleLogout} />} />
              <Route path="about" element={<About />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
              <Route path="contact" element={<Contact />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="disclaimer" element={<Disclaimer />} />
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Route>
          </>
        ) : (
          /* ═══ Guest ═══ */
          <>
            {/* Chat is full-screen — no Header/Footer */}
            <Route path="/chat" element={<Chat user={null} onAuthClick={openAuth} />} />

            {/* Everything else gets the standard landing layout */}
            <Route path="/" element={<GuestLayout onAuthClick={openAuth} />}>
              <Route index element={<Landing onTryNow={handleTryNow} onAuthClick={openAuth} />} />
              <Route path="about" element={<About />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
              <Route path="contact" element={<Contact />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="disclaimer" element={<Disclaimer />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </>
        )}
      </Routes>

      {/* Auth Modal (always mounted for animation safety) */}
      <AuthModal
        isOpen={authModal.isOpen}
        mode={authModal.mode}
        onClose={closeAuth}
        onSubmit={handleAuthSubmit}
        onSwitchMode={switchAuth}
      />
    </>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
