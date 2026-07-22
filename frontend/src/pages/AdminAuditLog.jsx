import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuditLog } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await getAuditLog();
        setLogs(res.data.audit_log || []);
      } catch (err) {
        console.error('Failed to fetch audit log:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
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
    if (type.includes('SUCCESS') || type.includes('REGISTER')) return 'var(--success)';
    return 'var(--gold)';
  };

  const getEventBg = (type) => {
    if (type.includes('FAIL') || type.includes('ERROR') || type.includes('FLAG')) return 'var(--danger-tint)';
    if (type.includes('SUCCESS') || type.includes('REGISTER')) return 'var(--success-tint)';
    return 'var(--gold-soft)';
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Audit Log</h2>
      
      <div className="alert alert-info" style={{ backgroundColor: 'var(--ink)', color: 'var(--gold-soft)', border: 'none', marginBottom: '2rem' }}>
        <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>🛡️</span>
        <strong>Admin Restricted Zone:</strong> This audit log is cryptographically immutable. All system events are permanently recorded.
      </div>
      
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Events Today', value: stats.eventsToday },
          { label: 'Failed Logins', value: stats.failedLogins, color: 'var(--danger)' },
          { label: 'Accounts Locked', value: stats.accountsLocked, color: 'var(--danger)' },
          { label: 'Flagged Requests', value: stats.flaggedRequests, color: 'var(--orange)' }
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>{stat.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: stat.color || 'var(--ink)', lineHeight: 1 }}>
              {loading ? '-' : stat.value}
            </p>
          </div>
        ))}
      </div>
      
      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--sand)' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)' }}>Time</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)' }}>Event</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)' }}>User ID</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)' }}>IP Address</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)' }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>Loading records...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>No audit logs found.</td></tr>
            ) : (
              logs.map((log, i) => (
                <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--gold-line)' : 'none' }}>
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
    </div>
  );
}
