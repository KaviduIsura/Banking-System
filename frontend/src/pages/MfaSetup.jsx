import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { setupInitialMfa, confirmMfa } from '../api';

export default function MfaSetup() {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  if (!state || !state.userId) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    const fetchSetup = async () => {
      try {
        // Since we are not authenticated yet, we use the initial setup endpoint
        // which requires the user's credentials to verify ownership before issuing the secret
        const res = await setupInitialMfa(state.email, state.password);
        setQrCode(res.data.qr_code_base64 || res.data.qr_code);
        setSecret(res.data.secret_plaintext || res.data.secret);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to initialize MFA setup');
      } finally {
        setLoading(false);
      }
    };
    fetchSetup();
  }, [state.email, state.password]);

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    
    setConfirming(true);
    setError('');
    
    try {
      await confirmMfa(state.userId, code);
      // Once confirmed, route back to login to get the JWT
      // (as per backend design: confirm doesn't return JWT, login does)
      navigate('/login', { state: { message: 'MFA enabled successfully! Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code. Try again.');
    } finally {
      setConfirming(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    alert('Secret copied to clipboard');
  };

  return (
    <div>
      <h3 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Secure your account</h3>
      <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Two-factor authentication is required.
      </p>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Generating secure key...</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {qrCode && (
              <img 
                src={`data:image/png;base64,${qrCode}`} 
                alt="MFA QR Code"
                style={{ border: '4px solid white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            )}
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button 
              className="btn btn-ghost" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
              onClick={() => setShowSecret(!showSecret)}
            >
              Can't scan the QR code?
            </button>
            
            {showSecret && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--sand)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>
                  Enter this secret manually in your app:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '2px' }}>
                    {secret}
                  </span>
                  <button onClick={copySecret} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                    📋
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <form onSubmit={handleConfirm}>
            <div className="form-group">
              <label className="form-label" style={{ textAlign: 'center' }}>Enter the 6-digit code to confirm</label>
              <input
                type="text"
                className="form-input mono"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="off"
                style={{ 
                  fontSize: '2rem', 
                  letterSpacing: '0.5rem', 
                  textAlign: 'center', 
                  padding: '1rem',
                  fontWeight: 600
                }}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={confirming || code.length !== 6}
            >
              {confirming ? 'Confirming...' : 'Confirm and enable'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
