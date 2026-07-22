import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBalance, transfer } from '../api';
import { toast } from 'react-hot-toast';
export default function Transfer() {
  const [balance, setBalance] = useState(null);
  const [accountNumber, setAccountNumber] = useState('');
  
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  
  const [step, setStep] = useState(1); // 1 = form, 2 = confirm, 3 = success
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const fetchBal = async () => {
      try {
        const res = await getBalance();
        setBalance(res.data.balance_cents);
        setAccountNumber(res.data.account_number);
      } catch (e) {
        console.error(e);
      }
    };
    fetchBal();
  }, []);

  const handleReview = (e) => {
    e.preventDefault();
    if (!toAccount) return toast.error('Recipient account is required');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return toast.error('Enter a valid amount');
    
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (balance !== null && amountCents > balance) {
      return toast.error('Insufficient funds');
    }
    
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!mfaCode || mfaCode.length !== 6) return toast.error('Enter a 6-digit MFA code');
    setLoading(true);
    
    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      const res = await transfer(toAccount.trim(), amountCents, mfaCode, note);
      setSuccessData(res.data);
      toast.success('Transfer successful!');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Transfer failed');
      setStep(1); // Back to form on error
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setToAccount('');
    setAmount('');
    setNote('');
    setStep(1);
    setSuccessData(null);
    // Reload balance
    getBalance().then(res => setBalance(res.data.balance_cents)).catch(console.error);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem' }}>Send Money</h2>
      
      <div className="card">
        {step === 1 && (
          <form onSubmit={handleReview}>
            <div className="form-group">
              <label className="form-label">From Account</label>
              <select className="form-input" disabled value={accountNumber}>
                <option value={accountNumber}>
                  {accountNumber || 'Loading...'} (Available: £{balance !== null ? (balance/100).toFixed(2) : '...'})
                </option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">To Account Number</label>
              <input
                type="text"
                className="form-input mono"
                value={toAccount}
                onChange={e => setToAccount(e.target.value)}
                placeholder="e.g. SB1234567890"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Amount</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  position: 'absolute', 
                  left: '1rem', 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 600, 
                  color: 'var(--ink-soft)' 
                }}>LKR</span>
                <input
                  type="number"
                  className="form-input mono"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  style={{ paddingLeft: '4rem', fontSize: '1.25rem' }}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Note (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="What's this for?"
              />
            </div>
            
            <div style={{ 
              backgroundColor: 'var(--sand)', 
              padding: '1rem', 
              borderRadius: '8px',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
              marginBottom: '1.5rem'
            }}>
              <span style={{ fontSize: '1.25rem' }}>🔒</span>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.4 }}>
                Every transfer is signed with your account's private key and recorded permanently on the immutable ledger.
              </p>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Review transfer →
            </button>
          </form>
        )}
        
        {step === 2 && (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '2rem' }}>Review Transfer</h3>
            
            <div style={{ backgroundColor: 'var(--sand)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-soft)', marginBottom: '0.5rem', fontWeight: 700 }}>Amount</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', color: 'var(--ink)' }}>
                £{parseFloat(amount).toFixed(2)}
              </p>
            </div>
            
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gold-line)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--ink-soft)' }}>From</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{accountNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gold-line)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--ink-soft)' }}>To</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{toAccount}</span>
              </div>
              {note && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gold-line)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--ink-soft)' }}>Note</span>
                  <span>{note}</span>
                </div>
              )}
            </div>
            
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Authenticator Code</label>
              <input
                type="text"
                className="form-input mono"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.25rem' }}
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', marginTop: '0.5rem', textAlign: 'center' }}>
                Enter the 6-digit code from your authenticator app to authorize this transaction.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-ghost" 
                style={{ flex: 1 }} 
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 2 }} 
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        )}
        
        {step === 3 && successData && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', 
              backgroundColor: 'var(--success-tint)', color: 'var(--success)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 1.5rem'
            }}>
              ✓
            </div>
            <h3 style={{ marginBottom: '1rem' }}>Transfer Successful!</h3>
            <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
              You sent <strong>{successData.amount}</strong> to <strong>{successData.to_account}</strong>.
            </p>
            <button className="btn btn-primary" onClick={resetForm}>
              Make another transfer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
