/**
 * Reset Password Page
 * Reached via the email link: /reset-password?token=abc123
 * Lets the user set a new password.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Scale, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { resetPassword } from '../services/api';
import { AuthCardSkeleton } from '../components/SkeletonLoader';
import '../styles/auth.css';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMounting, setIsMounting] = useState(true);

    useEffect(() => { const t = setTimeout(() => setIsMounting(false), 300); return () => clearTimeout(t); }, []);
    if (isMounting) return <AuthCardSkeleton />;

    const validate = () => {
        if (!token) return 'Invalid reset link — no token found.';
        if (password.length < 12) return 'Password must be at least 12 characters';
        if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
        if (!/\d/.test(password)) return 'Password must contain at least one number';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
        if (password !== confirmPassword) return 'Passwords do not match';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        try {
            const res = await resetPassword(token, password);
            setSuccess(res.message || 'Password has been reset successfully!');
            // Redirect to home after a short delay so user can read the message
            setTimeout(() => navigate('/'), 3000);
        } catch (err) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-overlay" style={{ position: 'fixed' }}>
            <div className="auth-modal">
                {/* Header */}
                <div className="auth-header">
                    <div className="auth-logo">
                        <Scale size={28} />
                    </div>
                    <h2>Set New Password</h2>
                    <p>Enter your new password below</p>
                </div>

                {success ? (
                    <div className="auth-success">
                        <CheckCircle size={20} />
                        <span>{success}</span>
                        <p style={{ marginTop: 12, fontSize: '0.9rem', color: '#9ca3af' }}>
                            Redirecting to sign in…
                        </p>
                    </div>
                ) : (
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="new-password">
                                <Lock size={16} /> New Password
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="new-password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    placeholder="Enter new password"
                                    autoComplete="new-password"
                                    aria-required="true"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <small className="password-hint">
                                Min 12 characters · uppercase · lowercase · number · special character
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm-new-password">
                                <Lock size={16} /> Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirm-new-password"
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                                aria-required="true"
                            />
                        </div>

                        {error && (
                            <div className="auth-error">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <button type="submit" className="auth-submit" disabled={isLoading}>
                            {isLoading ? 'Resetting…' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <p>
                        <Link to="/" className="auth-switch">← Back to Home</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;
