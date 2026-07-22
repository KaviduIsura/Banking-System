import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';
import { toast } from 'react-hot-toast';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword || !fullName || !dateOfBirth || !phoneNumber || !address) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Backend returns { account_number, welcome_balance, user_id }
      const res = await register(
        email, 
        password, 
        nationalId || undefined, 
        fullName, 
        dateOfBirth, 
        phoneNumber, 
        address
      );
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
        toast.error('Network Error: Please open https://localhost:8443 in a new tab and accept the self-signed certificate.');
      } else {
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) {
          toast.error(detail[0].msg);
        } else {
          toast.error(detail || 'Registration failed.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Create an Account</h3>
      
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
          <div style={{ position: 'relative' }}>
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
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
          <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: '0.5rem' }}>
            Hint: Use an uppercase letter and a number
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-confirm-password">Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-confirm-password"
              type={showPassword ? "text" : "password"}
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="full-name">Full Name</label>
            <input
              id="full-name"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="date-of-birth">Date of Birth</label>
            <input
              id="date-of-birth"
              type="date"
              className="form-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="phone-number">Phone Number</label>
          <input
            id="phone-number"
            type="tel"
            className="form-input"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+44 7700 900077"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="address">Home Address</label>
          <textarea
            id="address"
            className="form-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Financial District..."
            rows={2}
          />
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
