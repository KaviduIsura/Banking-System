import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      const { mfa_enabled, user_id } = res.data;
      
      if (mfa_enabled) {
        navigate('/mfa-verify', { state: { userId: user_id, email } });
      } else {
        navigate('/mfa-setup', { state: { userId: user_id, email, password } });
      }
    } catch (err) {
      if (err.message === 'Network Error') {
        setError('Network Error: Please open https://localhost:8443 in a new tab and accept the self-signed certificate.');
      } else {
        setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Sign in to Solstice</h3>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <a href="#" style={{ fontSize: '0.75rem', fontWeight: 500 }} onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '1rem' }}
          disabled={loading}
        >
          {loading ? 'Authenticating...' : 'Continue →'}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
        Don't have an account? <Link to="/register">Create one</Link>
      </div>
    </div>
  );
}
