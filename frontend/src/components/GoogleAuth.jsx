/**
 * Google OAuth Button Component with PKCE Flow
 * 
 * PKCE (Proof Key for Code Exchange) Flow:
 * 1. Generate code_verifier (random string)
 * 2. Create code_challenge = SHA256(code_verifier)
 * 3. Store code_verifier in sessionStorage
 * 4. Redirect to Google with code_challenge
 * 5. On callback, send code + code_verifier to backend
 */

import React, { useState } from 'react';
import '../styles/google-auth.css';

// Google Icon SVG
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE() {
    // Generate random code verifier (43-128 chars)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // Create SHA256 hash for code challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    return { codeVerifier, codeChallenge };
}

/**
 * Google OAuth Button
 */
function GoogleAuth({ onSuccess, onError, isLoading: externalLoading }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);

        try {
            // Step 1: Generate PKCE codes
            const { codeVerifier, codeChallenge } = await generatePKCE();

            // Step 2: Get OAuth URL from backend
            // In production, use same origin (empty string). In dev, use localhost
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
                (import.meta.env.PROD ? '' : 'http://localhost:8000');
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/google/url`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to get Google OAuth URL');
            }

            const { auth_url, state } = await response.json();

            // Step 3: Store PKCE verifier and state in sessionStorage
            sessionStorage.setItem('oauth_code_verifier', codeVerifier);
            sessionStorage.setItem('oauth_state', state);

            // Step 4: Add code_challenge to auth URL and redirect
            const urlWithPKCE = `${auth_url}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

            // Redirect to Google
            window.location.href = urlWithPKCE;

        } catch (error) {
            console.error('Google OAuth error:', error);
            setIsLoading(false);
            if (onError) {
                onError(error.message);
            }
        }
    };

    const loading = isLoading || externalLoading;

    return (
        <button
            type="button"
            className={`google-auth-btn ${loading ? 'loading' : ''}`}
            onClick={handleGoogleLogin}
            disabled={loading}
        >
            {loading ? (
                <div className="google-spinner"></div>
            ) : (
                <>
                    <GoogleIcon />
                    <span>Continue with Google</span>
                </>
            )}
        </button>
    );
}

export default GoogleAuth;
