/**
 * AuthContext — single source of truth for authentication state.
 *
 * Replaces prop-drilling of `user`, `onLogout`, `onAuthClick` and
 * removes direct `localStorage.getItem('LawGPT_user')` reads from
 * individual pages (e.g. About.jsx).
 *
 * Usage:
 *   import { useAuth } from '../contexts/AuthContext';
 *   const { user, isAuthenticated, logout, openAuth } = useAuth();
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { registerUser, loginUser, logoutUser, fetchCurrentUser, silentRefresh } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'LawGPT_user';

export function AuthProvider({ children, navigate }) {
    const [user, setUser] = useState(() => {
        try {
            // Migrate legacy key once
            const OLD_KEY = 'nyayasahay_user';
            if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(OLD_KEY)) {
                localStorage.setItem(STORAGE_KEY, localStorage.getItem(OLD_KEY));
                localStorage.removeItem(OLD_KEY);
            }
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    });

    const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'signin' });
    const [authNotice, setAuthNotice] = useState(null);

    // Listen for session expiry events from api.js (401 responses)
    useEffect(() => {
        const handleExpired = () => {
            setUser(null);
            navigate?.('/');
        };
        window.addEventListener('auth:expired', handleExpired);
        return () => window.removeEventListener('auth:expired', handleExpired);
    }, [navigate]);

    // ── Proactive session validation on startup ──
    // When the app loads with a saved user, validate the session immediately.
    // This handles the case where the user returns after the access token
    // expired (30 min) but the refresh token (7 days) is still valid.
    const startupValidated = useRef(false);
    useEffect(() => {
        if (!user || startupValidated.current) return;
        startupValidated.current = true;

        (async () => {
            const profile = await fetchCurrentUser();
            if (profile) {
                // Session is valid (possibly after a silent refresh).
                // Update localStorage with fresh profile data.
                const refreshed = {
                    ...user,
                    full_name: profile.full_name ?? user.full_name,
                    is_superuser: profile.is_superuser ?? user.is_superuser,
                    email: profile.email ?? user.email,
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
                setUser(refreshed);
            }
            // If profile is null, authedFetch already fired auth:expired
            // which clears user state via the listener above.
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Periodic silent token refresh ──
    // Refresh the access token every 25 minutes (before the 30-min expiry)
    // so the session stays alive while the tab is open.
    useEffect(() => {
        if (!user) return;
        const REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes
        const interval = setInterval(() => {
            silentRefresh().catch(() => {});
        }, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [user]);

    const isAuthenticated = !!user;

    // ── Auth modal helpers ──
    const openAuth = useCallback((mode = 'signin') => setAuthModal({ isOpen: true, mode }), []);
    const closeAuth = useCallback(() => setAuthModal({ isOpen: false, mode: 'signin' }), []);
    const switchAuth = useCallback((mode) => setAuthModal({ isOpen: true, mode }), []);
    const clearAuthNotice = useCallback(() => setAuthNotice(null), []);

    const handleAuthSubmit = useCallback(async (formData) => {
        if (authModal.mode === 'signin') {
            await loginUser(formData.email, formData.password);
            const profile = await fetchCurrentUser();
            const u = {
                email: formData.email,
                full_name: profile?.full_name,
                is_superuser: profile?.is_superuser,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
            setUser(u);
            closeAuth();
            navigate?.('/chat');
        } else {
            // Registration: if login after register fails, still complete registration
            await registerUser(formData.name, formData.email, formData.password);
            try {
                await loginUser(formData.email, formData.password);
                const profile = await fetchCurrentUser();
                const u = {
                    email: formData.email,
                    name: formData.name,
                    full_name: profile?.full_name,
                    is_superuser: profile?.is_superuser,
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
                setUser(u);
                closeAuth();
                navigate?.('/chat');
            } catch {
                // Registration succeeded but auto-login failed (e.g. email verification required)
                closeAuth();
                setAuthNotice({
                    type: 'success',
                    message: 'Account created! Please check your email to verify your address before signing in.',
                });
            }
        }
    }, [authModal.mode, closeAuth, navigate]);

    const handleLoginSuccess = useCallback((userData) => {
        setUser(userData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } catch {
            // API call may fail if session already expired — still clear local state
        } finally {
            setUser(null);
            localStorage.removeItem(STORAGE_KEY);
            navigate?.('/');
        }
    }, [navigate]);

    const value = {
        user,
        isAuthenticated,
        authModal,
        authNotice,
        openAuth,
        closeAuth,
        switchAuth,
        clearAuthNotice,
        handleAuthSubmit,
        handleLoginSuccess,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}

export default AuthContext;
