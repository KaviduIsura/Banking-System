import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      // Backend returns { account_number, welcome_balance, user_id }
      const res = await register(email, password, nationalId || undefined);
      navigate('/mfa-setup', { 
        state: { 
          userId: res.data.user_id, 
          email: email, 
          password: password, // Passed temporarily to get the initial setup token
          isNew: true 
        } 
      });
    } catch (err) {
      if (err.message === 'Network Error') {
        setError('Network Error: Please open https://localhost:8443 in a new tab and accept the self-signed certificate.');
      } else {
        setError(err.response?.data?.detail || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Create an Account</h3>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">Email address</label>
          <input
            id="reg-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: '0.5rem' }}>
            Hint: Use an uppercase letter and a number
          </p>
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="national-id">National ID <span style={{ fontWeight: 400 }}>(Optional)</span></label>
          <input
            id="national-id"
            type="text"
            className="form-input"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="e.g. 123456789V"
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>🔒</span> Encrypted before it's stored
          </p>
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '1rem' }}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}
