/**
 * Main App — Dual-branch SaaS Routing
 *
 * Guest  → GuestLayout  (Header + page + Footer)
 * Auth   → AppShell     (Sidebar + page)
 *
 * All auth state lives in AuthContext — no prop-drilling.
 */

import React, { Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
} from 'react-router-dom';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout components (always loaded)
import Header from './components/Header';
import Footer from './components/Footer';
import AppShell from './components/AppShell';
import AuthModal from './components/AuthModal';

// Lazy-loaded pages — only downloaded when the route is visited
const Landing = React.lazy(() => import('./pages/Landing'));
const Chat = React.lazy(() => import('./pages/Chat'));
const About = React.lazy(() => import('./pages/About'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Contact = React.lazy(() => import('./pages/Contact'));
const FAQ = React.lazy(() => import('./pages/FAQ'));
const Disclaimer = React.lazy(() => import('./pages/Disclaimer'));
const ProfileDashboard = React.lazy(() => import('./pages/ProfileDashboard'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const Rights = React.lazy(() => import('./pages/Rights'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));

// Admin pages — never loaded for regular users
const AdminLayout = React.lazy(() => import('./components/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'));
const QueryAnalytics = React.lazy(() => import('./pages/admin/QueryAnalytics'));

/* ── Suspense fallback ──────────────────────────────── */
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <div style={{ width: 36, height: 36, border: '3px solid rgba(38,184,184,0.3)', borderTopColor: '#26B8B8', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
  </div>
);

/* ── Guest Layout (Header + Footer wrapper) ────────── */
function GuestLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}

/* ── Root Layout (reads auth state from context) ───── */
function AppLayout() {
  const { user, isAuthenticated, authModal, authNotice, openAuth, closeAuth, switchAuth, handleAuthSubmit, clearAuthNotice } = useAuth();
  const navigate = useNavigate();


  // ── Routes ────────────────────────────────────────
  return (
    <>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* OAuth callback — outside any layout */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Password reset — outside any layout */}
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Email verification — outside any layout */}
        <Route path="/verify-email" element={<VerifyEmail />} />

        {isAuthenticated ? (
          /* ═══ Authenticated ═══ */
          <>
            {/* Admin routes — standalone layout (no AppShell sidebar) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="analytics" element={<QueryAnalytics />} />
            </Route>

            {/* Main app routes — inside AppShell */}
            <Route path="/" element={<AppShell />}>
              <Route index element={<Navigate to="/chat" replace />} />
              <Route path="chat" element={<Chat />} />
              <Route path="rights" element={<Rights />} />
              <Route path="profile" element={<ProfileDashboard />} />
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
            <Route path="/chat" element={<Chat />} />

            {/* Everything else gets the standard landing layout */}
            <Route path="/" element={<GuestLayout />}>
              <Route index element={<Landing />} />
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
      </Suspense>

      {/* Auth Modal (always mounted for animation safety) */}
      <AuthModal
        isOpen={authModal.isOpen}
        mode={authModal.mode}
        onClose={closeAuth}
        onSubmit={handleAuthSubmit}
        onSwitchMode={switchAuth}
      />

      {/* Auth notice banner (e.g. verification required after registration) */}
      {authNotice && (
        <div
          role={authNotice.type === 'success' ? 'status' : 'alert'}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
            background: authNotice.type === 'success' ? '#065f46' : '#7f1d1d',
            color: '#fff', padding: '14px 24px', textAlign: 'center',
            fontSize: '0.95rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 12,
          }}
        >
          <span>{authNotice.message}</span>
          <button
            type="button"
            onClick={clearAuthNotice}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff', borderRadius: 6, padding: '4px 14px', cursor: 'pointer',
              fontSize: '0.85rem' }}
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

/* ── Bridge: injects useNavigate into AuthProvider ─── */
function AppWithAuth() {
  const navigate = useNavigate();
  return (
    <AuthProvider navigate={navigate}>
      <AppLayout />
    </AuthProvider>
  );
}

function App() {
  return (
    <Router>
      <AppWithAuth />
    </Router>
  );
}

export default App;
