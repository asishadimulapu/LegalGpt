/**
 * Main App Component - Fixed Navigation
 * Routes and layout for NyayaSahay Legal Assistant
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
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
import AuthCallback from './pages/AuthCallback';

// Services
import { registerUser, loginUser, validateToken } from './services/api';

/**
 * App Layout Component — provides navigation context
 *
 * Viva Explanation:
 * - Central orchestrator for the entire web application UI
 * - Manages auth state with optimistic localStorage restore
 * - Routes users between Landing, Chat, and static pages
 * - Provides AuthModal for sign-in/register flows
 */
function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'signin' });
  const [user, setUser] = useState(null);

  // Optimistic session restore: set user immediately, validate token in background.
  // This eliminates the race condition where Chat.jsx renders before
  // token validation completes, making the user appear logged-out.
  useEffect(() => {
    const saved = localStorage.getItem('nyayasahay_user');
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        // Optimistic: show user instantly (prevents flash of logged-out state)
        setUser(userData);

        // Background: validate token — if invalid, clear state silently
        const originalToken = userData.token;
        validateToken(userData.token).then(isValid => {
          if (!isValid) {
            // Re-read localStorage to avoid clearing a newer session
            const current = localStorage.getItem('nyayasahay_user');
            if (current) {
              try {
                const currentData = JSON.parse(current);
                if (currentData.token !== originalToken) return; // stale validation
              } catch { /* corrupted — clear below */ }
            }
            console.log('Session expired, logging out');
            localStorage.removeItem('nyayasahay_user');
            setUser(null);
          }
        }).catch((err) => {
          // Only suppress expected network/offline errors
          if (!navigator.onLine || err?.name === 'TypeError' || err?.message?.includes('fetch')) {
            console.log('Token validation skipped (offline/network error)');
          } else {
            console.error('Unexpected error during token validation:', err);
          }
        });
      } catch {
        // Corrupted localStorage entry
        localStorage.removeItem('nyayasahay_user');
      }
    }
  }, []);

  // Handle auth modal
  const handleAuthClick = (mode) => {
    setAuthModal({ isOpen: true, mode });
  };

  const handleAuthClose = () => {
    setAuthModal({ isOpen: false, mode: 'signin' });
  };

  const handleAuthSwitch = (mode) => {
    setAuthModal({ isOpen: true, mode });
  };

  // Handle auth submission
  const handleAuthSubmit = async (formData) => {
    try {
      if (authModal.mode === 'signin') {
        const response = await loginUser(formData.email, formData.password);
        const userData = { email: formData.email, token: response.access_token };
        setUser(userData);
        localStorage.setItem('nyayasahay_user', JSON.stringify(userData));
        handleAuthClose();
        navigate('/chat');
      } else {
        await registerUser(formData.name, formData.email, formData.password);
        // Auto login after registration
        const loginResponse = await loginUser(formData.email, formData.password);
        const userData = { email: formData.email, name: formData.name, token: loginResponse.access_token };
        setUser(userData);
        localStorage.setItem('nyayasahay_user', JSON.stringify(userData));
        handleAuthClose();
        navigate('/chat');
      }
    } catch (error) {
      throw error;
    }
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nyayasahay_user');
    navigate('/');
  };

  // Navigate to chat (Start Free Consultation button)
  const handleTryNow = () => {
    navigate('/chat');
  };

  // Handle OAuth login success
  const handleOAuthSuccess = (userData) => {
    setUser(userData);
  };

  // Don't show header/footer on chat page for fullscreen experience
  const isChatPage = location.pathname === '/chat';

  return (
    <>
      {!isChatPage && <Header onAuthClick={handleAuthClick} user={user} onLogout={handleLogout} />}

      <Routes>
        <Route path="/" element={<Landing onTryNow={handleTryNow} onAuthClick={handleAuthClick} />} />
        <Route path="/chat" element={<Chat user={user} onAuthClick={handleAuthClick} onLogout={handleLogout} />} />
        <Route path="/auth/callback" element={<AuthCallback onLoginSuccess={handleOAuthSuccess} />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/features" element={<Landing onTryNow={handleTryNow} onAuthClick={handleAuthClick} />} />
        <Route path="/how-it-works" element={<Landing onTryNow={handleTryNow} onAuthClick={handleAuthClick} />} />
        <Route path="/your-rights" element={<Landing onTryNow={handleTryNow} onAuthClick={handleAuthClick} />} />
        <Route path="/resources" element={<Landing onTryNow={handleTryNow} onAuthClick={handleAuthClick} />} />
        <Route path="*" element={<Landing onTryNow={handleTryNow} onAuthClick={handleAuthClick} />} />
      </Routes>

      {!isChatPage && <Footer />}

      <AuthModal
        isOpen={authModal.isOpen}
        mode={authModal.mode}
        onClose={handleAuthClose}
        onSubmit={handleAuthSubmit}
        onSwitchMode={handleAuthSwitch}
      />
    </>
  );
}

/**
 * App Component
 */
function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
