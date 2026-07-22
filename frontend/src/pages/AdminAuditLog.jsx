import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuditLog, getPendingTransactions, approveTransaction, rejectTransaction } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit');

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [auditRes, pendingRes] = await Promise.all([
          getAuditLog(),
          getPendingTransactions()
        ]);
        setLogs(auditRes.data.audit_log || []);
        setPending(pendingRes.data.pending_transactions || []);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const isToday = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  // Compute stats client-side
  const stats = {
    eventsToday: logs.filter(l => isToday(l.created_at)).length,
    failedLogins: logs.filter(l => l.event_type === 'LOGIN_FAIL' || l.event_type === 'MFA_FAIL').length,
    accountsLocked: logs.filter(l => l.event_type === 'ACCOUNT_LOCKED').length, // Assuming this event exists conceptually
    flaggedRequests: logs.filter(l => l.event_type === 'SUSPICIOUS_REQUEST' || l.event_type === 'IDS_FLAG').length 
  };

  const getEventColor = (type) => {
    if (type.includes('FAIL') || type.includes('ERROR') || type.includes('FLAG')) return 'var(--danger)';
    if (type.includes('SUCCESS') || type.includes('REGISTER')) return 'var(--teal)';
    return 'var(--ink-soft)';
  };

  const getEventBg = (type) => {
    if (type.includes('FAIL') || type.includes('ERROR') || type.includes('FLAG')) return 'var(--danger-tint)';
    if (type.includes('SUCCESS') || type.includes('REGISTER')) return 'var(--teal-light)';
    return '#E5E7EB';
  };

  const handleApprove = async (txId) => {
    try {
      await approveTransaction(txId);
      toast.success('Transaction approved and funds settled.');
      setPending(pending.filter(tx => tx.id !== txId));
    } catch (err) {
      toast.error('Failed to approve transaction.');
    }
  };

  const handleReject = async (txId) => {
    try {
      await rejectTransaction(txId);
      toast.success('Transaction rejected.');
      setPending(pending.filter(tx => tx.id !== txId));
    } catch (err) {
      toast.error('Failed to reject transaction.');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActiveTab('audit')}
          >
            Audit Log
          </button>
          <button 
            className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActiveTab('pending')}
          >
            Pending Transfers {pending.length > 0 && <span style={{ background: 'var(--danger)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '50%', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{pending.length}</span>}
          </button>
        </div>
      </div>
      
      <div className="alert alert-info" style={{ backgroundColor: 'var(--teal-light)', color: 'var(--teal-dark)', border: 'none', marginBottom: '2rem' }}>
        <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>🛡️</span>
        <strong>Admin Restricted Zone:</strong> This audit log is cryptographically immutable. All system events are permanently recorded.
      </div>
      
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Events Today', value: stats.eventsToday, color: 'var(--teal)' },
          { label: 'Failed Logins', value: stats.failedLogins, color: 'var(--danger)' },
          { label: 'Accounts Locked', value: stats.accountsLocked, color: 'var(--danger)' },
          { label: 'Flagged Requests', value: stats.flaggedRequests, color: 'var(--accent-yellow)' }
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>{stat.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: stat.color || 'var(--ink)', lineHeight: 1 }}>
              {loading ? '-' : stat.value}
            </p>
          </div>
        ))}
      </div>
      
      {/* Content based on tab */}
      {activeTab === 'audit' ? (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#F9FAFB' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Time</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Event</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>User ID</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>IP Address</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>Loading records...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>No audit logs found.</td></tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid #E5E7EB' : 'none' }} className="hover-lift">
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        backgroundColor: getEventBg(log.event_type),
                        color: getEventColor(log.event_type),
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}>
                        {log.event_type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                      {log.user_id || 'SYSTEM'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                      {log.ip_address}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#F9FAFB' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Time</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>From Account</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>To Account</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Amount</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>Loading records...</td></tr>
              ) : pending.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>No pending transactions found.</td></tr>
              ) : (
                pending.map((tx, i) => (
                  <tr key={tx.id} style={{ borderBottom: i < pending.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {formatDate(tx.created_at)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                      ID: {tx.from_account}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                      ID: {tx.to_account}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 'bold' }}>
                      £{(tx.amount_cents / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleApprove(tx.id)}>Approve</button>
                        <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger-tint)' }} onClick={() => handleReject(tx.id)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
