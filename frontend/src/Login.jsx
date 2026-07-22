import { useState } from 'react';
import { login, register, verifyMfa, confirmMfa, setupMfa, setupInitialMfa, setToken } from './api';

/**
 * Login component — handles:
 *  Step 1: Register OR Login (email + password)
 *  Step 2a: MFA Setup (first time — scan QR code)
 *  Step 2b: MFA Verify (enter 6-digit TOTP code)
 */
export default function Login({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [step, setStep] = useState(1);       // 1 = credentials, 2 = mfa
  const [mfaPhase, setMfaPhase] = useState('verify'); // 'setup' | 'verify'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [qrCode, setQrCode] = useState(null);

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => { setError(''); setSuccess(''); };

  // ── Step 1: Credentials ────────────────────────────────────────────────
  const handleCredentials = async () => {
    clearMessages();
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await register(email, password, nationalId || undefined);
        setSuccess(`Account created! ${res.data.account_number} — Welcome balance: ${res.data.welcome_balance}. Now log in.`);
        setMode('login');
      } else {
        const res = await login(email, password);
        setUserId(res.data.user_id);
        if (res.data.mfa_enabled) {
          setMfaPhase('verify');
          setStep(2);
        } else {
          // MFA not yet set up — need to set it up after getting a temporary token
          // For simplicity: ask user to set up MFA
          setMfaPhase('setup-needed');
          setStep(2);
        }
      }
    } catch (err) {
      if (err.message === 'Network Error') {
        setError('Network Error: The backend might be offline or your browser is blocking the self-signed certificate. Please open https://localhost:8443 in a new tab and click "Proceed", then return here.');
      } else {
        const msg = err.response?.data?.detail || 'Something went wrong';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── MFA Setup (first time) ─────────────────────────────────────────────
  const handleMfaSetupRequest = async () => {
    clearMessages();
    setLoading(true);
    try {
      // Issue a temporary token-less setup by calling a special setup endpoint
      const res = await setupInitialMfa(email, password);
      setError('');
      setMfaPhase('setup');
      setQrCode(res.data.qr_code_base64);
      setUserId(res.data.user_id);
      setSuccess('Scan the QR code with Google Authenticator and enter the code below.');
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'MFA setup failed');
      setLoading(false);
    }
  };

  // ── MFA Verify ─────────────────────────────────────────────────────────
  const handleMfaVerify = async () => {
    clearMessages();
    if (!mfaCode || mfaCode.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await verifyMfa(userId, mfaCode);
      setToken(res.data.access_token);
      onSuccess(email);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid MFA code');
    } finally {
      setLoading(false);
    }
  };

  // ── MFA Confirm (after scanning QR) ───────────────────────────────────
  const handleMfaConfirm = async () => {
    clearMessages();
    if (!mfaCode || mfaCode.length !== 6) { setError('Enter the 6-digit code from the app'); return; }
    setLoading(true);
    try {
      await confirmMfa(userId, mfaCode);
      setSuccess('MFA enabled! Now log in again.');
      setStep(1);
      setMfaCode('');
      setQrCode(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'MFA confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e, fn) => { if (e.key === 'Enter') fn(); };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="page-center">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🏦</div>
          <span className="auth-logo-text">SecureBank</span>
        </div>
        <p className="auth-subtitle">
          {step === 1
            ? mode === 'login' ? 'Sign in to your account' : 'Create a new account'
            : 'Two-factor authentication'}
        </p>

        {/* Step indicator */}
        <div className="auth-step-indicator">
          <div className={`step-dot ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`} />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
        </div>

        {/* Messages */}
        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* ── Step 1: Credentials ───────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                id="email-input"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => handleKey(e, handleCredentials)}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="password-input"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => handleKey(e, handleCredentials)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">National ID <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional — encrypted)</span></label>
                <input
                  id="national-id-input"
                  className="form-input"
                  type="text"
                  placeholder="e.g. 123456789V"
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value)}
                />
              </div>
            )}

            <button
              id="credentials-submit"
              className="btn btn-primary btn-full"
              onClick={handleCredentials}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : mode === 'login' ? 'Continue →' : 'Create Account'}
            </button>

            <div className="auth-toggle">
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => { setMode('register'); clearMessages(); }}>Register</button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => { setMode('login'); clearMessages(); }}>Sign in</button>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Step 2a: MFA not set up ───────────────────────────────────── */}
        {step === 2 && mfaPhase === 'setup-needed' && (
          <>
            <div className="alert alert-info">
              Your account doesn't have Two-Factor Authentication configured yet. You must set it up before you can log in.
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={handleMfaSetupRequest}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Set up MFA now'}
            </button>
            <button
              className="btn btn-ghost btn-full"
              onClick={() => { setStep(1); clearMessages(); }}
              style={{ marginTop: 8 }}
            >
              ← Back to Login
            </button>
          </>
        )}

        {/* ── Step 2b: MFA Verify ───────────────────────────────────────── */}
        {step === 2 && mfaPhase === 'verify' && (
          <>
            <div className="alert alert-info">
              Enter the 6-digit code from your authenticator app.
            </div>
            <div className="form-group">
              <label className="form-label">Authenticator Code</label>
              <input
                id="mfa-code-input"
                className="form-input otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => handleKey(e, handleMfaVerify)}
                autoFocus
              />
            </div>
            <button
              id="mfa-verify-submit"
              className="btn btn-primary btn-full"
              onClick={handleMfaVerify}
              disabled={loading || mfaCode.length !== 6}
            >
              {loading ? <span className="spinner" /> : 'Verify & Sign In 🔐'}
            </button>
            <div className="auth-toggle">
              <button onClick={() => { setStep(1); setMfaCode(''); clearMessages(); }}>← Back</button>
            </div>
          </>
        )}

        {/* ── Step 2c: MFA QR Confirm ───────────────────────────────────── */}
        {step === 2 && mfaPhase === 'setup' && (
          <>
            {qrCode && (
              <div className="qr-wrapper">
                <img src={`data:image/png;base64,${qrCode}`} alt="MFA QR Code" />
                <p style={{color:'#333', fontSize:'0.75rem', textAlign:'center'}}>Scan with Google Authenticator</p>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Confirm code from app</label>
              <input
                id="mfa-confirm-input"
                className="form-input otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            <button
              id="mfa-confirm-submit"
              className="btn btn-success btn-full"
              onClick={handleMfaConfirm}
              disabled={loading || mfaCode.length !== 6}
            >
              {loading ? <span className="spinner" /> : 'Enable MFA ✓'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
