import React from 'react';
import { Outlet } from 'react-router-dom';
import Logo from '../components/Logo';

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <Logo size={40} />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
