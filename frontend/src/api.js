import axios from 'axios';

// NOTE: Accept the self-signed cert warning by visiting https://localhost:8443 once in your browser
const api = axios.create({
  baseURL: 'https://localhost:8443',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token automatically if stored in memory
let _token = null;

export const setToken = (token) => { _token = token; };
export const getToken = () => _token;
export const clearToken = () => { _token = null; };

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearToken();
      // Use window.location to force a redirect back to login if unauthorized
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (email, password, nationalId) =>
  api.post('/register', { email, password, national_id: nationalId });

export const login = (email, password) =>
  api.post('/login', { email, password });

export const verifyMfa = (userId, code) =>
  api.post('/mfa/verify', { user_id: userId, code });

export const setupMfa = () =>
  api.post('/mfa/setup');

export const setupInitialMfa = (email, password) =>
  api.post('/dev/setup-mfa', { email, password });

export const confirmMfa = (userId, code) =>
  api.post('/mfa/confirm', { user_id: userId, code });

// Banking
export const getBalance = () =>
  api.get('/balance');

export const getTransactions = () =>
  api.get('/transactions');

export const transfer = (toAccountNumber, amountCents, mfaCode, note) =>
  api.post('/transfer', { to_account_number: toAccountNumber, amount_cents: amountCents, mfa_code: mfaCode, note });

export const getAuditLog = () =>
  api.get('/admin/audit-log');

export const freezeAccount = () =>
  api.post('/freeze-account');

export default api;
