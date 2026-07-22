# SecureBank Security Architecture & Documentation

This document provides a comprehensive overview of the security measures, cryptographic protocols, and defensive mechanisms implemented in the SecureBank application. The system is designed to simulate a highly secure banking environment resilient against common web vulnerabilities (OWASP Top 10) and internal tampering.

---

## 1. Authentication & Session Management

### 1.1 Password Hashing (Argon2)

Passwords are never stored in plain text. SecureBank utilizes the **Argon2** hashing algorithm, which is the winner of the Password Hashing Competition (PHC) and the current industry standard recommended by OWASP.

- **Why Argon2?** It provides resistance against both GPU cracking (via memory-hardness) and side-channel attacks.
- **Implementation:** Managed via the `passlib` library in `security/crypto.py`.

### 1.2 JWT (JSON Web Tokens)

Stateless authentication is handled using JWTs.

- **Algorithm:** HS256 (HMAC with SHA-256).
- **Expiration:** Tokens are strictly short-lived (typically 30 minutes) to minimize the window of opportunity if a token is intercepted.
- **Storage:** On the frontend, tokens are stored securely and attached as Bearer tokens to the `Authorization` header of subsequent API requests.

### 1.3 Multi-Factor Authentication (MFA/2FA)

A Time-based One-Time Password (TOTP) system is enforced for critical actions.

- **Login Flow:** A user cannot obtain a JWT access token using only their password. The login endpoint returns a temporary `user_id` state, which must be passed along with a 6-digit TOTP code to the `/mfa/verify` endpoint.
- **Transfer Authorization:** High-value actions like transferring funds explicitly require the user to input a fresh MFA code to authorize the transaction.
- **Implementation:** Powered by the `pyotp` library, generating standard `otpauth://` URIs for Google Authenticator/Authy integration.

---

## 2. Cryptographic Audit Log & Non-Repudiation

To ensure accountability and detect insider threats, SecureBank implements a cryptographically verifiable Audit Log.

### 2.1 Immutable Hash Chain

Every critical system event (e.g., Logins, Transfers, Admin Actions) is recorded in the `audit_logs` table.

- **Chaining Mechanism:** Each new log entry calculates a SHA-256 hash that includes its own data _plus_ the hash of the previous log entry.
- **Immutability:** This creates a blockchain-like data structure. If an attacker (or a rogue database administrator) modifies or deletes a historical record, the hash chain is broken, and the tampering becomes immediately mathematically evident.

### 2.2 Event Tracking

The system explicitly logs:

- `LOGIN_SUCCESS` / `LOGIN_FAIL`
- `MFA_SUCCESS` / `MFA_FAIL`
- `TRANSFER_INITIATED` / `TRANSFER_COMPLETED`
- `SUSPICIOUS_REQUEST` / `ACCOUNT_LOCKED`

---

## 3. Threat Mitigation (OWASP Defenses)

### 3.1 Rate Limiting (Brute Force Protection)

- **Implementation:** Handled via the `slowapi` library acting as middleware on the FastAPI application.
- **Thresholds:** Endpoints like `/login` and `/mfa/verify` are strictly rate-limited (e.g., 5 requests per minute per IP) to prevent automated brute-forcing or credential stuffing attacks.

### 3.2 SQL Injection (SQLi) Protection

- **Implementation:** The backend does not use a heavyweight ORM; instead, it uses raw SQL queries via `aiomysql`.
- **Defense:** All database queries strictly utilize parameterized queries (prepared statements). User input is never concatenated directly into SQL strings, entirely neutralizing SQL injection vectors.

### 3.3 Cross-Site Scripting (XSS) & CSRF

- **XSS:** The React frontend automatically escapes data rendered in JSX, neutralizing DOM-based and Reflected XSS.
- **CSRF:** Since the application uses stateless JWTs passed in headers (rather than relying on ambient cookies), it is inherently protected against Cross-Site Request Forgery (CSRF).

### 3.4 Transport Layer Security (TLS/SSL)

The backend is configured to run exclusively over HTTPS.

- Uvicorn is launched with `server.key` and `server.crt`.
- This ensures that all data (passwords, JWTs, financial data) is encrypted in transit, neutralizing packet sniffing and Man-in-the-Middle (MitM) attacks.

---

## 4. Business Logic Security

### 4.1 Transfer Reviews (Anti-Money Laundering Simulation)

Transfers exceeding a specific threshold (e.g., LKR1,000) do not execute immediately.

- The system places them in a `pending_review` state.
- Administrators must manually review and explicitly `approve` or `reject` the transaction via the isolated Admin Dashboard.

### 4.2 Account Freezing

Users have a "kill switch" on their dashboard. If they suspect their account is compromised, they can click "Freeze Account".

- This updates their status in the database, forcefully logs them out, and prevents any further logins or transactions until an administrator resolves the issue.

### 4.3 Admin Isolation

The frontend employs Strict Role-Based Access Control (RBAC).

- If an admin logs in, they are forcibly redirected to the Admin Dashboard and are entirely locked out of the standard customer features (transfers, profile views).
- If a standard user attempts to route to `/admin/audit-log`, they are instantly redirected back to their customer dashboard.
