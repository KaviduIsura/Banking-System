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

  const filteredData = transactions.filter(tx => {
    if (filter === 'Credits' && tx.type !== 'credit') return false;
    if (filter === 'Debits' && tx.type !== 'debit') return false;
    // We don't actually have pending in this backend, so pending returns empty
    if (filter === 'Pending') return false;
    
    if (search) {
      const q = search.toLowerCase();
      const matchAcct = tx.from_account.toLowerCase().includes(q) || tx.to_account.toLowerCase().includes(q);
      const matchAmt = tx.amount_display.toLowerCase().includes(q);
      if (!matchAcct && !matchAmt) return false;
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
          borderBottom: '1px solid var(--gold-line)',
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
                  borderColor: filter === f ? 'var(--orange)' : 'var(--gold-line)',
                  backgroundColor: filter === f ? 'var(--orange-tint)' : 'transparent',
                  color: filter === f ? 'var(--orange-deep)' : 'var(--ink-soft)',
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
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
              No transactions found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)' }}>Date</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)' }}>Description</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)' }}>Account</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)' }}>Type</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--ink-soft)', fontSize: '0.875rem', borderBottom: '1px solid var(--gold-line)', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((tx, i) => (
                  <tr key={tx.id} style={{ borderBottom: i < filteredData.length - 1 ? '1px solid var(--gold-line)' : 'none' }}>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                      {formatDate(tx.created_at)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>
                      {tx.type === 'credit' ? 'Transfer In' : 'Transfer Out'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
                      {tx.type === 'credit' ? tx.from_account : tx.to_account}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        backgroundColor: tx.type === 'credit' ? 'var(--success-tint)' : 'var(--danger-tint)',
                        color: tx.type === 'credit' ? 'var(--success)' : 'var(--danger)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right', color: tx.type === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount_display}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: 'var(--success-tint)',
                        color: 'var(--success)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '99px',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
