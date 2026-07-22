import React, { useState } from 'react';
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { verifyMfa } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MfaVerify() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const state = location.state;
  if (!state || !state.userId) {
    return <Navigate to="/login" replace />;
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await verifyMfa(state.userId, code);
      login(res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'That code didn\'t match. Check your app and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Two-Factor Verification</h3>
      <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Signing in as {state.email}. <Link to="/login" style={{ fontWeight: 500 }}>Not you?</Link>
      </p>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleVerify}>
        <div className="form-group">
          <input
            type="text"
            className="form-input mono"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
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
          disabled={loading || code.length !== 6}
        >
          {loading ? 'Verifying...' : 'Verify and continue 🔐'}
        </button>
      </form>
    </div>
  );
}
