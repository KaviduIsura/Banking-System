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
              <span className="nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </span>
              <span className="nav-label">Audit Log</span>
            </NavLink>
          ) : (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </span>
                <span className="nav-label">Dashboard</span>
              </NavLink>
              
              <NavLink to="/transfer" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </span>
                <span className="nav-label">Transfer</span>
              </NavLink>
              
              <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                </span>
                <span className="nav-label">History</span>
              </NavLink>
            </>
          )}

          <div className="nav-label-group" style={{ marginTop: '2rem' }}>Support</div>
          <a href="#" onClick={handleLogout} className="nav-item">
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </span>
            <span className="nav-label">Sign out</span>
          </a>
        </div>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: '0.25rem' }}>Sign in as</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="avatar-chip">
                <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#5F6B8A"/>
                  <path d="M12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12ZM12 14C8.67 14 2 15.67 2 19V23C2 23.55 2.45 24 3 24H21C21.55 24 22 23.55 22 23V19C22 15.67 15.33 14 12 14Z" fill="#E4E7EB"/>
                </svg>
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
             <div className="avatar-chip" style={{ color: 'var(--ink)' }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
             </div>
             <div className="avatar-chip" style={{ padding: 0, overflow: 'hidden' }}>
                <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#5F6B8A"/>
                  <path d="M12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12ZM12 14C8.67 14 2 15.67 2 19V23C2 23.55 2.45 24 3 24H21C21.55 24 22 23.55 22 23V19C22 15.67 15.33 14 12 14Z" fill="#E4E7EB"/>
                </svg>
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
