# Truba Bank System: Comprehensive Project Report

## 1. Executive Summary
The Truba Bank prototype is a full-stack, highly secure financial application. It serves as a professional demonstration of modern web security, cryptographic protocols, and robust application architecture. The system is designed to simulate a real-world banking environment, defending against common web vulnerabilities (OWASP Top 10) while providing a frictionless, responsive user experience.

---

## 2. Application Flow & User Experience

The application enforces a strict lifecycle for user actions to ensure security and non-repudiation.

### 2.1 Customer Registration & Onboarding
1. A user creates an account by providing personal details (Name, DOB, Address) and a password.
2. Upon registration, the system generates a unique Account Number and a unique TOTP (Time-based One-Time Password) secret.
3. The user is presented with a QR Code, which they must scan using an authenticator app (e.g., Google Authenticator, Authy) to complete their profile setup.

### 2.2 Secure Login (2FA)
1. The user inputs their email and password.
2. The backend verifies the password hash. If valid, the backend *does not* immediately issue an access token. Instead, it prompts the frontend to ask for a 6-digit MFA code.
3. The user inputs the 6-digit code from their authenticator app.
4. The system automatically verifies the code. Upon success, a stateless JWT (JSON Web Token) is issued, granting access to the customer dashboard.

### 2.3 Dashboard & Account Details
1. The dashboard securely fetches the user's current available balance, full profile details, and recent transaction history.
2. The user has access to a "Freeze Account" kill switch, instantly locking their account and invalidating their session in the event of suspected compromise.

### 2.4 Fund Transfers & Anti-Money Laundering (AML) Simulation
1. The user initiates a transfer by entering a recipient account number and an amount.
2. To submit the transfer, the user must input a fresh 6-digit MFA code, acting as a cryptographic signature of intent.
3. If the transfer amount exceeds the automated threshold (e.g., £1,000), the system intercepts the transfer, placing it in a `pending_review` state rather than settling the funds immediately.

### 2.5 Admin Operations & RBAC
1. An administrator logs into the system (using a separate, highly privileged account).
2. Through strict Role-Based Access Control (RBAC), the admin is routed to a specialized, isolated Admin Dashboard. They cannot access customer features.
3. The admin reviews the queue of `pending_review` transactions, manually choosing to `Approve` or `Reject` them.
4. The admin has full visibility into the Cryptographic Audit Log, observing all system events (failed logins, completed transfers, account freezes) in real-time.

---

## 3. System Architecture

### 3.1 Decoupled Client-Server Model
- **Frontend:** Built with React. It handles the presentation layer and state management but holds no proprietary security logic or database access.
- **Backend:** Built with FastAPI (Python). It acts as the strict gatekeeper. Built on Starlette, FastAPI natively supports asynchronous operations, allowing it to handle high concurrency typical of financial transaction processing.

### 3.2 Stateless Authentication Architecture
- Traditional session-based authentication requires the server to track session states in a database. Truba Bank utilizes stateless **JSON Web Tokens (JWT)**.
- **Scalability:** The server simply verifies the cryptographic signature of the token, making horizontal scaling trivial.
- **CSRF Mitigation:** By relying on stateless JWTs sent explicitly via the `Authorization` header, the browser does not automatically attach credentials to cross-origin requests, structurally neutralizing Cross-Site Request Forgery (CSRF) vulnerabilities.

---

## 4. Cryptographic Algorithms in Use

The system employs industry-standard cryptography to protect data at rest and in transit.

### 4.1 Password Hashing: Argon2
- **Use Case:** Securing user passwords in the database.
- **Rationale:** Argon2id is the winner of the Password Hashing Competition (PHC) and the current OWASP recommendation. It is "memory-hard," meaning it requires significant RAM to compute hashes. This renders brute-force and dictionary attacks via GPUs or ASICs impractically expensive for attackers, while also defending against side-channel timing attacks.

### 4.2 Token Signing: HS256 (HMAC with SHA-256)
- **Use Case:** Cryptographically signing JSON Web Tokens (JWTs).
- **Rationale:** HS256 is a highly performant symmetric algorithm. Since the FastAPI backend is the sole issuer and verifier of the tokens, a shared secret is perfectly suited. It ensures that token payloads (such as user ID and role permissions) cannot be tampered with by a malicious client.

### 4.3 Immutable Audit Logging: SHA-256 Hash Chaining
- **Use Case:** Creating a tamper-evident audit log for all system events.
- **Rationale:** Financial systems demand absolute non-repudiation. Every time a system event occurs, a SHA-256 hash is computed combining the event's data *and* the hash of the immediately preceding event. This creates a blockchain-like data structure. If a rogue administrator attempts to alter historical transaction data, the mathematical chain is broken, immediately alerting auditors to the tampering.

### 4.4 Multi-Factor Authentication: TOTP (RFC 6238)
- **Use Case:** Secondary authentication for logins and transaction verification.
- **Rationale:** Time-based One-Time Passwords (TOTP) rely on a shared secret and the current UNIX timestamp, meaning the user's authenticator app generates valid codes entirely offline. This neutralizes phishing and credential stuffing attacks; an attacker with a stolen password still cannot breach the account without physical access to the user's secondary device.

---

## 5. Additional Security Features & Threat Mitigation

### 5.1 SQL Injection (SQLi) Prevention
The backend uses raw SQL via the `aiomysql` asynchronous driver to maintain total control over query performance. However, all queries strictly utilize **prepared statements (parameterization)**. By explicitly separating the SQL structure from user-provided inputs at the driver level, SQL injection attacks are rendered impossible.

### 5.2 Rate Limiting (Brute Force Defense)
To prevent automated attacks (such as credential stuffing or MFA brute-forcing), strict rate-limiting middlewares are applied to the API endpoints. If an IP address requests the login or MFA verification endpoints too frequently, it is temporarily blocked from the system.

### 5.3 Transport Layer Security (TLS/SSL)
The backend enforces HTTPS. All data transmitted between the React client and the FastAPI backend (including passwords, JWTs, and financial data) is encrypted in transit. This neutralizes packet sniffing and Man-in-the-Middle (MitM) attacks.
