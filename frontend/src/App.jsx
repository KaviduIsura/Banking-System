import { useState } from 'react';
import './index.css';
import Login from './Login';
import Dashboard from './Dashboard';

/**
 * App root — manages authentication state.
 * Shows Login when logged out, Dashboard when authenticated.
 * The JWT token is stored in-memory (not localStorage) to avoid XSS exposure.
 */
export default function App() {
  const [user, setUser] = useState(null); // null = logged out, string = email

  const handleLoginSuccess = (email) => {
    setUser(email);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return user
    ? <Dashboard email={user} onLogout={handleLogout} />
    : <Login onSuccess={handleLoginSuccess} />;
}
