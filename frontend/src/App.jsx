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
 * App Layout Component - provides navigation context
 */
function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'signin' });
  const [user, setUser] = useState(null);

  // Validate token on app load - prevent showing logged in with expired token
  useEffect(() => {
    const validateSession = async () => {
      const saved = localStorage.getItem('nyayasahay_user');
      if (saved) {
        const userData = JSON.parse(saved);
        try {
          // Validate token with backend
          const isValid = await validateToken(userData.token);
          if (isValid) {
            setUser(userData);
          } else {
            // Token expired - clear storage
            console.log('Session expired, logging out');
            localStorage.removeItem('nyayasahay_user');
            setUser(null);
          }
        } catch (error) {
          // Token invalid or server error - clear storage
          console.log('Token validation failed:', error.message);
          localStorage.removeItem('nyayasahay_user');
          setUser(null);
        }
      }
    };
    validateSession();
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
