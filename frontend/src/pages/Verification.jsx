import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { verifyKyc } from '../api';

export default function Verification() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleVerify = async () => {
    setLoading(true);
    // Simulate a brief AI verification delay for professional feel
    setTimeout(async () => {
      try {
        await verifyKyc();
        toast.success('Identity verified! Your account is fully unlocked.', { icon: '🎉' });
        navigate('/dashboard');
      } catch (err) {
        toast.error('Verification failed. Please try again.');
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <div className="verification-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
        <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Verify Your Identity</h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem', lineHeight: 1.6 }}>
          As a regulated financial institution, we are required by law to verify your identity before you can transfer funds.
        </p>

        {step === 1 ? (
          <div className="upload-box" style={{ 
            border: '2px dashed var(--gold-mute)', 
            padding: '3rem 2rem', 
            borderRadius: '12px',
            backgroundColor: 'var(--bg-inset)',
            marginBottom: '2rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }} onClick={() => setStep(2)}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
            <h4 style={{ margin: 0, color: 'var(--ink)' }}>Click to simulate ID upload</h4>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
              Passport, Driving License, or National ID
            </p>
          </div>
        ) : (
          <div className="upload-box" style={{ 
            border: '2px solid var(--gold)', 
            padding: '2rem', 
            borderRadius: '12px',
            backgroundColor: 'var(--bg-inset)',
            marginBottom: '2rem',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <h4 style={{ margin: 0, color: 'var(--ink)' }}>Document securely uploaded</h4>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
              Ready for AI verification
            </p>
          </div>
        )}

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', opacity: step === 1 ? 0.5 : 1 }}
          onClick={handleVerify}
          disabled={step === 1 || loading}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Verifying Document...
            </span>
          ) : 'Submit for Verification'}
        </button>
      </div>
    </div>
  );
}
