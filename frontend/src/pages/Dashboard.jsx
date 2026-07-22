import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getBalance, getTransactions, freezeAccount } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const [balance, setBalance] = useState(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleFreeze = async () => {
    if (window.confirm("Are you sure you want to freeze your account? You will be logged out and cannot log back in until you contact support.")) {
      try {
        await freezeAccount();
        toast.success("Account frozen successfully.");
        logout();
      } catch (err) {
        toast.error("Failed to freeze account.");
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balRes, txRes] = await Promise.all([getBalance(), getTransactions()]);
        setBalance(balRes.data.balance_cents);
        setAccountNumber(balRes.data.account_number);
        setTransactions(txRes.data.transactions.slice(0, 5)); // only last 5
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCents = (cents) => {
    if (cents === null) return { main: '0', decimal: '00' };
    const str = (cents / 100).toFixed(2);
    const [main, decimal] = str.split('.');
    return { main: parseInt(main).toLocaleString('en-GB'), decimal };
  };

  const { main, decimal } = formatCents(balance);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Welcome back</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Hero Card */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, var(--ink) 0%, #3a2b1c 100%)', 
          color: 'var(--paper)',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <p style={{ color: 'var(--gold-soft)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Available Balance
            </p>
            <div style={{ margin: '1rem 0' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', lineHeight: 1 }}>
                £{main}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', opacity: 0.8 }}>
                .{decimal}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
              A/C: {accountNumber || 'SB-XXXXXXXX'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-primary" onClick={() => navigate('/transfer')}>Send money</button>
            <button className="btn btn-ghost" style={{ color: 'var(--paper)', borderColor: 'rgba(255,255,255,0.2)' }}>Account details</button>
          </div>
        </div>

        {/* Security Check-up Card */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--gold)' }}>🛡️</span> Security Check-up
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--sand)', borderRadius: '8px' }}>
              <div>
                <p style={{ fontWeight: 700 }}>Two-Factor Auth</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>Protects your account</p>
              </div>
              <span style={{ backgroundColor: 'var(--success-tint)', color: 'var(--success)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800 }}>
                ENABLED
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--sand)', borderRadius: '8px' }}>
              <div>
                <p style={{ fontWeight: 700 }}>Recent Logins</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>No suspicious activity</p>
              </div>
              <span style={{ backgroundColor: 'var(--success-tint)', color: 'var(--success)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800 }}>
                VERIFIED
              </span>
            </div>
            
            <button 
              className="btn btn-ghost" 
              style={{ color: 'var(--danger)', borderColor: 'var(--danger-tint)', marginTop: '0.5rem' }}
              onClick={handleFreeze}
            >
              Freeze Account
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gold-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Recent Activity</h3>
          <Link to="/history" style={{ fontSize: '0.875rem' }}>View all →</Link>
        </div>
        
        {transactions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
            No recent activity to display.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {transactions.map((tx, i) => (
              <div key={tx.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                borderBottom: i < transactions.length - 1 ? '1px solid var(--gold-line)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    backgroundColor: tx.type === 'credit' ? 'var(--success-tint)' : 'var(--danger-tint)',
                    color: tx.type === 'credit' ? 'var(--success)' : 'var(--danger)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '1.2rem'
                  }}>
                    {tx.type === 'credit' ? '↙' : '↗'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700 }}>{tx.type === 'credit' ? `From ${tx.from_account}` : `To ${tx.to_account}`}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <p style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontWeight: 600,
                    color: tx.type === 'credit' ? 'var(--success)' : 'var(--danger)',
                    fontSize: '1.125rem'
                  }}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount_display}
                  </p>
                  <span style={{ 
                    backgroundColor: 'var(--success-tint)', 
                    color: 'var(--success)', 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: '99px', 
                    fontSize: '0.7rem', 
                    fontWeight: 800 
                  }}>
                    COMPLETED
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
