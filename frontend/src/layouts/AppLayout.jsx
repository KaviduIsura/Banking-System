import React from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function AppLayout() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
  };

  return (
    <div className="app-layout">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className="app-sidebar">
        <div className="sidebar-header">
          <Logo size={32} showWordmark={true} />
        </div>
        
        <div className="sidebar-nav">
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
          
          {user.role === 'admin' && (
            <NavLink to="/admin/audit-log" className={({ isActive }) => isActive ? 'nav-item active admin-nav' : 'nav-item admin-nav'}>
              <span className="nav-icon">🛡️</span>
              <span className="nav-label">Audit Log</span>
            </NavLink>
          )}
        </div>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-role">{user.role}</span>
            <span className="user-id">User ID: {user.id}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Sign out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="app-main">
        <header className="app-header">
          <div className="header-title">
             {/* Title will be set by child pages or we can leave it blank */}
          </div>
          <div className="header-actions">
             <div className="bell-icon">🔔</div>
             <div className="avatar-chip">
               <span>U</span>
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
