/**
 * OAuth Callback Page
 * 
 * Handles the redirect from Google OAuth:
 * 1. Extracts authorization code and state from URL
 * 2. Validates state matches stored value (CSRF protection)
 * 3. Sends code + code_verifier to backend
 * 4. Stores JWT token and redirects to chat
 *
 * Viva Explanation:
 * - This is the return URL after Google sign-in completes
 * - Handles both web (PKCE) and mobile (transfer code) flows
 * - Stores user session and instantly redirects to the main chat UI
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/auth-callback.css';

function AuthCallback({ onLoginSuccess }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('processing');
    const [error, setError] = useState(null);
    const isProcessing = useRef(false); // Prevent double execution

    useEffect(() => {
        const handleCallback = async () => {
            // Prevent double execution (React Strict Mode / code reuse)
            if (isProcessing.current) {
                console.log('OAuth callback already processing, skipping...');
                return;
            }
            isProcessing.current = true;

            try {
                // Step 1: Extract parameters from URL
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const errorParam = searchParams.get('error');

                // Detect mobile flow from state prefix (encoded by backend)
                // New format: mobile.<base64url(redirect)>.<random_token>
                // Legacy format: mobile_<random_token>
                const isMobile = state && (state.startsWith('mobile.') || state.startsWith('mobile_'));

                // Check for Google OAuth errors
                if (errorParam) {
                    throw new Error(`Google OAuth error: ${errorParam}`);
                }

                if (!code) {
                    throw new Error('Authorization code not found');
                }

                let codeVerifier = null;

                // Step 4: Exchange code for tokens via backend (ALWAYS verify on server)
                // In production, use same origin (empty string). In dev, use localhost
                if (isMobile) {
                    console.log('Mobile OAuth flow detected - validating via backend');
                } else {
                    // Web flow: validate state from sessionStorage
                    const storedState = sessionStorage.getItem('oauth_state');
                    codeVerifier = sessionStorage.getItem('oauth_code_verifier');

                    // Clear storage immediately to prevent reuse
                    sessionStorage.removeItem('oauth_state');
                    sessionStorage.removeItem('oauth_code_verifier');

                    if (!storedState || state !== storedState) {
                        throw new Error('Invalid state parameter. Please try logging in again.');
                    }

                    if (!codeVerifier) {
                        throw new Error('Code verifier not found. Please try logging in again.');
                    }
                }

                // Step 4: Exchange code for tokens via backend
                // In production, use same origin (empty string). In dev, use localhost
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
                    (import.meta.env.PROD ? '' : 'http://localhost:8000');
                const response = await fetch(`${API_BASE_URL}/api/v1/auth/google/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: code,
                        code_verifier: codeVerifier,
                        state: state
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Authentication failed');
                }

                const data = await response.json();

                if (isMobile) {
                    // Extract mobile redirect URI from state
                    let mobileRedirectBase = 'nyayasahay://auth/callback'; // Default fallback

                    if (state.startsWith('mobile.')) {
                        try {
                            // State format: mobile.<base64url(redirect)>.<random_token>
                            const parts = state.split('.');
                            if (parts.length >= 2) {
                                let b64 = parts[1];
                                // Restore base64 padding
                                while (b64.length % 4 !== 0) b64 += '=';
                                // Decode base64url → standard base64 → string
                                const decoded = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));

                                // Anti-Open Redirect: Validate scheme
                                const allowedSchemes = ['exp://', 'nyayasahay://'];
                                const isValidScheme = allowedSchemes.some(scheme => decoded.startsWith(scheme));

                                if (isValidScheme) {
                                    mobileRedirectBase = decoded;
                                } else {
                                    console.warn('Blocked potentially unsafe redirect:', decoded);
                                    // Fallback to default
                                    mobileRedirectBase = 'nyayasahay://auth/callback';
                                }
                            }
                        } catch (e) {
                            console.error('Failed to parse mobile redirect from state:', e);
                        }
                    }

                    // Build deep link URL with auth data (Use transfer_code if available)
                    let deepLinkUrl;
                    if (data.transfer_code) {
                        // Secure flow: construct URL safely with URL API
                        const url = new URL(mobileRedirectBase);
                        url.searchParams.set('code', data.transfer_code);
                        deepLinkUrl = url.toString();
                    } else {
                        // No transfer code — do NOT embed token in URL
                        console.warn('No transfer_code received; cannot securely redirect to mobile app');
                        setStatus('error');
                        setError('Mobile auth failed: missing transfer code. Please try again.');
                        return;
                    }
                    console.log('Mobile redirect URL generated');

                    setStatus('success');

                    // Redirect to mobile app via deep link
                    window.location.href = deepLinkUrl;

                    // Fallback: show message if deep link doesn't work
                    setTimeout(() => {
                        setStatus('mobile_fallback');
                    }, 3000);
                    return;
                }

                // Web flow: store user data and redirect
                const userData = {
                    email: data.user.email,
                    name: data.user.full_name,
                    token: data.access_token
                };
                localStorage.setItem('nyayasahay_user', JSON.stringify(userData));

                // Notify parent component
                if (onLoginSuccess) {
                    onLoginSuccess(userData);
                }

                setStatus('success');

                // Redirect to chat immediately — no delay needed
                navigate('/chat');

            } catch (err) {
                console.error('OAuth callback error:', err);
                setStatus('error');
                setError(err.message);
            }
        };

        handleCallback();
    }, [searchParams, navigate, onLoginSuccess]);

    return (
        <div className="auth-callback-container">
            <div className="auth-callback-card">
                {status === 'processing' && (
                    <>
                        <div className="auth-callback-spinner"></div>
                        <h2>Signing you in...</h2>
                        <p>Please wait while we complete your sign-in with Google.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="auth-callback-success">✓</div>
                        <h2>Welcome!</h2>
                        <p>Sign-in successful. Redirecting to chat...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="auth-callback-error">✗</div>
                        <h2>Sign-in Failed</h2>
                        <p className="error-message">{error}</p>
                        <button
                            className="retry-btn"
                            onClick={() => navigate('/')}
                        >
                            Return to Home
                        </button>
                    </>
                )}

                {status === 'mobile_fallback' && (
                    <>
                        <div className="auth-callback-success">✓</div>
                        <h2>Sign-in Successful!</h2>
                        <p>Please return to the NyayaSahay app to continue.</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default AuthCallback;
