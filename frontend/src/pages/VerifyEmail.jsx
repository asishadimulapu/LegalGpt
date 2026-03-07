/**
 * Verify Email Page — handles the /verify-email?token=... link
 * from the registration confirmation email.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import '../styles/legal.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? '' : 'http://localhost:8000');

export default function VerifyEmail() {
    const [params] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = params.get('token');
        if (!token) {
            setStatus('error');
            setMessage('No verification token found in the URL.');
            return;
        }

        const controller = new AbortController();

        fetch(`${API_BASE_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
            credentials: 'include',
            signal: controller.signal,
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    setStatus('success');
                    setMessage(data.message || 'Email verified successfully!');
                } else {
                    setStatus('error');
                    setMessage(data.detail || 'Verification failed.');
                }
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setStatus('error');
                setMessage('Unable to connect to the server.');
            });

        return () => controller.abort();
    }, [params]);

    return (
        <div className="legal-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="legal-container" style={{ textAlign: 'center', maxWidth: 480, padding: '48px 32px' }}>
                {status === 'loading' && (
                    <>
                        <Loader size={48} className="legal-icon" style={{ animation: 'spin 1s linear infinite' }} />
                        <h1 style={{ marginTop: 16 }}>Verifying your email…</h1>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle size={48} style={{ color: '#26B8B8' }} />
                        <h1 style={{ marginTop: 16 }}>Email Verified!</h1>
                        <p style={{ color: '#9ca3af', marginTop: 8 }}>{message}</p>
                        <Link to="/" style={{ display: 'inline-block', marginTop: 24, padding: '12px 32px', background: '#26B8B8', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
                            Sign In
                        </Link>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle size={48} style={{ color: '#ef4444' }} />
                        <h1 style={{ marginTop: 16 }}>Verification Failed</h1>
                        <p style={{ color: '#9ca3af', marginTop: 8 }}>{message}</p>
                        <Link to="/" style={{ display: 'inline-block', marginTop: 24, padding: '12px 32px', background: '#374151', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
                            Go Home
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
