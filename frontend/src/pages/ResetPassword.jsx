import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api';
import { toast } from 'react-hot-toast';
import zxcvbn from 'zxcvbn';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordScore, setPasswordScore] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token.');
      navigate('/login');
    }
  }, [token, navigate]);

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    const result = zxcvbn(val);
    setPasswordScore(result.score);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordScore < 3) {
      toast.error('Password is too weak. Please use a stronger password.');
      return;
    }
    
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success('Password reset successfully. You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = () => {
    if (password.length === 0) return '#E5E7EB';
    if (passwordScore <= 1) return 'var(--danger)';
    if (passwordScore === 2) return 'var(--accent-yellow)';
    if (passwordScore >= 3) return 'var(--teal)';
    return '#E5E7EB';
  };

  if (!token) return null;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Create New Password</h2>
        <p style={{ color: 'var(--ink-soft)' }}>
          Enter a new, strong password for your account.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="password">New Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="••••••••"
            required
            disabled={loading}
            className="form-input"
          />
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '4px', height: '4px', width: '100%' }}>
              {[0, 1, 2, 3].map(i => (
                <div 
                  key={i} 
                  style={{ 
                    flex: 1, 
                    backgroundColor: password.length > 0 && passwordScore >= i ? getScoreColor() : '#E5E7EB',
                    borderRadius: '2px',
                    transition: 'background-color 0.3s ease'
                  }} 
                />
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: '0.25rem', textAlign: 'right' }}>
              {password.length === 0 ? 'Enter a password' : 
               passwordScore <= 1 ? 'Weak' : 
               passwordScore === 2 ? 'Fair' : 
               passwordScore === 3 ? 'Good' : 'Strong'}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            className="form-input"
          />
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
        
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <Link to="/login" style={{ color: 'var(--ink-soft)', textDecoration: 'none', fontSize: '0.875rem' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
