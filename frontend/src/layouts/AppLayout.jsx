import React, { useEffect, useRef } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin Isolation: Admins cannot access customer routes
  if (user.role === 'admin' && (location.pathname === '/dashboard' || location.pathname === '/transfer' || location.pathname === '/history')) {
    return <Navigate to="/admin/audit-log" replace />;
  }

  const handleLogout = (e) => {
    if (e) e.preventDefault();
    logout();
  };

  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      toast.error('Session expired due to inactivity. Please log in again.', { duration: 5000 });
      handleLogout();
    }, 5 * 60 * 1000); // 5 minutes
  };

  useEffect(() => {
    // Set up activity listeners
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer(); // Start timer initially

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, []);

  return (
    <div className="app-layout">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className="app-sidebar">
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.25rem' }}>
            <span style={{ color: 'var(--teal)' }}>❖</span> SecureBank
          </div>
        </div>
        
        <div className="sidebar-nav">
          <div className="nav-label-group">Main</div>
          
          {user.role === 'admin' ? (
            <NavLink to="/admin/audit-log" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">🛡️</span>
              <span className="nav-label">Audit Log</span>
            </NavLink>
          ) : (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">📊</span>
                <span className="nav-label">Dashboard</span>
              </NavLink>
              
              <NavLink to="/transfer" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">💸</span>
                <span className="nav-label">Transfer</span>
              </NavLink>
              
              <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">📋</span>
                <span className="nav-label">History</span>
              </NavLink>
            </>
          )}

          <div className="nav-label-group" style={{ marginTop: '2rem' }}>Support</div>
          <a href="#" onClick={handleLogout} className="nav-item">
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Sign out</span>
          </a>
        </div>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: '0.25rem' }}>Sign in as</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="avatar-chip" style={{ width: '32px', height: '32px', fontSize: '0.875rem' }}>
                {user.role === 'admin' ? 'A' : 'U'}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.role === 'admin' ? 'Administrator' : 'Customer'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>ID: {user.id}</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="app-main">
        <header className="app-header">
          <div className="header-breadcrumbs">
             Main <span>&gt; {location.pathname.replace('/', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
          </div>
          <div className="header-actions">
             <div className="action-pill">
               <span style={{ color: 'var(--teal)' }}>●</span> Status: Active
             </div>
             <div className="avatar-chip">
               🔔
             </div>
          </div>
        </header>
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
