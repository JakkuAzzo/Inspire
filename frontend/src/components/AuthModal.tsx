import React, { useState } from 'react';
import './AuthModal.css';

export type AuthMode = 'signup' | 'login' | 'guest' | 'verify-otp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: (email: string, password: string, displayName?: string) => Promise<void>;
  onVerifyOtp: (email: string, otpCode: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onGuestMode: () => Promise<void>;
}

export function AuthModal({
  isOpen,
  onClose,
  onSignup,
  onVerifyOtp,
  onLogin,
  onGuestMode
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  if (!isOpen) return null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSignup(email, password, displayName);
      setOtpSent(true);
      setMode('verify-otp');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onVerifyOtp(email, otpCode);
      // Success - modal will close automatically when auth state updates
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(email, password);
      // Success - modal will close automatically when auth state updates
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setError('');
    setLoading(true);

    try {
      await onGuestMode();
      // Success - modal will close automatically when auth state updates
    } catch (err: any) {
      setError(err.message || 'Guest mode failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={handleBackdropClick}>
      <div className="auth-modal">
        <button className="auth-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="auth-modal-header">
          <h2>Welcome to Inspire</h2>
          <p className="auth-modal-subtitle">
            {mode === 'verify-otp' 
              ? 'Check your email for verification code'
              : 'Choose how you want to continue'}
          </p>
        </div>

        {mode !== 'verify-otp' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup');
                setError('');
              }}
            >
              Sign Up
            </button>
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Login
            </button>
            <button
              className={`auth-tab ${mode === 'guest' ? 'active' : ''}`}
              onClick={() => {
                setMode('guest');
                setError('');
              }}
            >
              Guest Mode
            </button>
          </div>
        )}

        <div className="auth-modal-content">
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="auth-form">
              <div className="auth-form-group">
                <label htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="signup-displayName">Display Name (optional)</label>
                <input
                  id="signup-displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Cool Creator"
                  disabled={loading}
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Sign Up'}
              </button>

              <p className="auth-info-text">
                You'll receive a verification code via email
              </p>
            </form>
          )}

          {mode === 'verify-otp' && (
            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="auth-form-group">
                <label htmlFor="otp-code">Verification Code</label>
                <input
                  id="otp-code"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  maxLength={6}
                  pattern="\d{6}"
                  required
                  disabled={loading}
                  autoFocus
                  className="otp-input"
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading || otpCode.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Complete Signup'}
              </button>

              <button
                type="button"
                className="auth-back-btn"
                onClick={() => {
                  setMode('signup');
                  setOtpCode('');
                  setError('');
                }}
                disabled={loading}
              >
                ← Back to Signup
              </button>

              <p className="auth-info-text">
                Code expires in 10 minutes. Check your spam folder if you don't see it.
              </p>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {mode === 'guest' && (
            <div className="auth-guest-mode">
              <p className="auth-guest-description">
                Continue as a guest with a randomly generated username. 
                Your session will be temporary and won't be saved after you close the browser.
              </p>

              <button
                className="auth-submit-btn auth-guest-btn"
                onClick={handleGuestMode}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Continue as Guest'}
              </button>

              <p className="auth-info-text">
                Guest accounts are session-only and can't save work permanently
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
