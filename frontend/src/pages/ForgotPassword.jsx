import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api';
import { toast } from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
      toast.success('If the email exists, a reset link has been sent.');
    } catch (err) {
      // Still show success to prevent email enumeration attacks
      setSubmitted(true);
      toast.success('If the email exists, a reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Reset Password</h2>
        <p style={{ color: 'var(--ink-soft)' }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
      
      {submitted ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
          <h3 style={{ marginBottom: '1rem' }}>Check your email</h3>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
            We've sent a password reset link to <strong>{email}</strong>. The link is valid for 15 minutes.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
            Return to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="form-input"
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <Link to="/login" style={{ color: 'var(--ink-soft)', textDecoration: 'none', fontSize: '0.875rem' }}>
              &larr; Back to login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
