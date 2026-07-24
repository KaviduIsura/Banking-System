import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api';

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const res = await getTransactions();
        setTransactions(res.data.transactions);
      } catch (e) {
        console.error('Failed to load history:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchTx();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  // Helper: get badge style config for a given status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'var(--success-tint)',
          color: 'var(--success)',
          label: 'Completed',
        };
      case 'pending_review':
        return {
          bg: '#FFF7ED',
          color: '#C2410C',
          label: 'Pending Review',
        };
      case 'rejected':
        return {
          bg: 'var(--danger-tint)',
          color: 'var(--danger)',
          label: 'Rejected',
        };
      default:
        return {
          bg: '#F3F4F6',
          color: '#6B7280',
          label: status ?? 'Unknown',
        };
    }
  };

  const filteredData = transactions.filter(tx => {
    if (filter === 'Credits' && tx.type !== 'credit') return false;
    if (filter === 'Debits' && tx.type !== 'debit') return false;
    // Show only pending_review or rejected when Pending filter is active
    if (filter === 'Pending' && !['pending_review', 'rejected'].includes(tx.status)) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchAcct = tx.from_account.toLowerCase().includes(q) || tx.to_account.toLowerCase().includes(q);
      const matchAmt = tx.amount_display.toLowerCase().includes(q);
      const matchStatus = (tx.status ?? '').toLowerCase().includes(q);
      if (!matchAcct && !matchAmt && !matchStatus) return false;
    }

    return true;
  });

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Transaction History</h2>
      
      <div className="card" style={{ padding: '0' }}>
        
        {/* Filters & Search */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['All', 'Credits', 'Debits', 'Pending'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '99px',
                  border: '1px solid',
                  borderColor: filter === f ? 'var(--teal)' : '#E5E7EB',
                  backgroundColor: filter === f ? 'var(--teal)' : 'transparent',
                  color: filter === f ? '#FFFFFF' : 'var(--ink-soft)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div>
            <input
              type="text"
              className="form-input"
              placeholder="Search accounts or amount..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '250px', padding: '0.5rem 1rem' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-soft)' }}>Loading...</div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              <h3 style={{ fontSize: '1.125rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>No transactions found</h3>
              <p>We couldn't find any matching transactions.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#F9FAFB' }}>
                <tr>
                   <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Date</th>
                   <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Description</th>
                   <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Account</th>
                   <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Type</th>
                   <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB', textAlign: 'right' }}>Amount</th>
                   <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }}>Status</th>
                   <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid #E5E7EB' }}>Tx ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((tx, i) => {
                   const badge = getStatusBadge(tx.status);
                   const isRejected = tx.status === 'rejected';
                   const isPending = tx.status === 'pending_review';

                   return (
                   <tr
                     key={tx.id}
                     style={{
                       borderBottom: i < filteredData.length - 1 ? '1px solid #E5E7EB' : 'none',
                       opacity: isRejected ? 0.65 : 1,
                       backgroundColor: isRejected ? '#FFF5F5' : isPending ? '#FFFBEB' : 'transparent',
                     }}
                     className="hover-lift"
                   >
                     <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                       {formatDate(tx.created_at)}
                     </td>
                     <td style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>
                       {tx.type === 'credit' ? 'Transfer In' : 'Transfer Out'}
                       {isPending && (
                         <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#C2410C', fontWeight: 600 }}>
                           ⏳ Awaiting admin review
                         </span>
                       )}
                       {isRejected && (
                         <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>
                           ✕ Funds not deducted
                         </span>
                       )}
                     </td>
                     <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
                       {tx.type === 'credit' ? tx.from_account : tx.to_account}
                     </td>
                     <td style={{ padding: '1rem 1.5rem' }}>
                       <span style={{
                         backgroundColor: tx.type === 'credit' ? 'var(--teal-light)' : 'var(--danger-tint)',
                         color: tx.type === 'credit' ? 'var(--teal)' : 'var(--danger)',
                         padding: '0.25rem 0.5rem',
                         borderRadius: '4px',
                         fontSize: '0.75rem',
                         fontWeight: 800,
                         textTransform: 'uppercase'
                       }}>
                         {tx.type}
                       </span>
                     </td>
                     <td style={{
                       padding: '1rem 1.5rem',
                       fontFamily: 'var(--font-mono)',
                       fontWeight: 600,
                       textAlign: 'right',
                       color: isRejected
                         ? '#9CA3AF'
                         : tx.type === 'credit'
                           ? 'var(--teal)'
                           : 'var(--ink)',
                       textDecoration: isRejected ? 'line-through' : 'none',
                     }}>
                       {tx.type === 'credit' ? '+' : '-'} {tx.amount_display}
                     </td>
                     <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                       <span style={{
                         backgroundColor: badge.bg,
                         color: badge.color,
                         padding: '0.25rem 0.75rem',
                         borderRadius: '99px',
                         fontSize: '0.75rem',
                         fontWeight: 800,
                         whiteSpace: 'nowrap',
                       }}>
                         {badge.label}
                       </span>
                     </td>
                     <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                       #{tx.id}
                     </td>
                   </tr>
                   );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
