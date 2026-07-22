import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';
import { toast } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Email and password are required');
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
        toast.error('Network Error: Please open https://localhost:8443 in a new tab and accept the self-signed certificate.');
      } else {
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) {
          toast.error(detail[0].msg);
        } else {
          toast.error(detail || 'Login failed. Please check your credentials.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Sign in to Solstice</h3>
      
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
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-soft)'
              }}
            >
              {showPassword ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
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
