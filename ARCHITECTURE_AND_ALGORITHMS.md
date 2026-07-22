# Architecture & Algorithms Rationale

This document provides a detailed breakdown of the architectural decisions and cryptographic algorithms utilized within the SecureBank system. It serves to explain *why* specific technologies were chosen and how they contribute to a secure, performant, and scalable banking prototype.

---

## 1. System Architecture

### 1.1 Decoupled Client-Server Model
**Technologies:** React (Frontend) + FastAPI (Backend)
**Rationale:** 
- **Separation of Concerns:** By decoupling the presentation layer from the business logic and data access layers, the system becomes significantly easier to maintain and scale.
- **Security:** The backend acts as a strict gatekeeper. The frontend never connects directly to the database and holds no proprietary logic. All security rules, rate limits, and cryptographic operations are securely isolated on the backend.
- **Performance:** FastAPI is built on Starlette and Pydantic, making it one of the fastest Python frameworks available due to its native asynchronous support. This allows the backend to handle high concurrency, crucial for financial transaction processing.

### 1.2 Stateless Authentication Architecture
**Technologies:** JSON Web Tokens (JWT)
**Rationale:**
- **Scalability:** Unlike session-based authentication which requires the server to maintain session states in memory or a database, JWTs are self-contained. The server simply verifies the cryptographic signature of the token to authenticate a request. This makes horizontally scaling the backend trivial.
- **CSRF Mitigation:** Traditional cookie-based sessions are highly vulnerable to Cross-Site Request Forgery (CSRF). By utilizing stateless JWTs sent explicitly via the `Authorization` header, the browser does not automatically attach credentials to cross-origin requests, structurally preventing CSRF attacks.

### 1.3 Strict Role-Based Access Control (RBAC)
**Rationale:** 
- The system enforces a strict boundary between `customer` and `admin` roles.
- **Principle of Least Privilege:** Admins are completely restricted from initiating transfers or viewing standard customer dashboards. Conversely, customers are forcefully blocked from accessing the immutable audit logs and pending transfer queues. This isolation prevents privilege escalation vulnerabilities.

---

## 2. Cryptographic Algorithms

### 2.1 Password Hashing: Argon2
**Algorithm:** Argon2 (specifically Argon2id)
**Use Case:** Hashing user passwords for secure storage.
**Rationale:**
- **Industry Standard:** Argon2 won the Password Hashing Competition (PHC) and is the current premier recommendation by OWASP for password storage.
- **Memory-Hardness:** Unlike older algorithms (like MD5 or SHA-256) which are fast and can be quickly cracked using parallel processing on GPUs/ASICs, Argon2 is intentionally designed to be "memory-hard." It requires a significant amount of RAM to compute the hash, making brute-force and dictionary attacks extremely expensive and impractically slow for attackers.
- **Side-Channel Resistance:** The `Argon2id` variant provides robust defense against side-channel attacks (like timing attacks) by utilizing data-independent memory access.

### 2.2 Token Signing: HS256
**Algorithm:** HMAC with SHA-256
**Use Case:** Signing JSON Web Tokens (JWT).
**Rationale:**
- HS256 is a symmetric algorithm, meaning the same secret key is used to sign and verify the token. 
- It is highly performant and perfectly suited for this architecture where the sole issuer and verifier of the token is the FastAPI backend itself. It ensures that the payload (e.g., User ID, Role) cannot be altered by a malicious actor without invalidating the cryptographic signature.

### 2.3 Immutable Audit Logging: SHA-256 Hash Chaining
**Algorithm:** SHA-256 (Secure Hash Algorithm 256-bit)
**Use Case:** Creating a cryptographically secure, tamper-evident audit log.
**Rationale:**
- **Tamper Evidence:** Financial systems require non-repudiation. If a malicious insider (e.g., a rogue database admin) modifies a transaction record, the system must detect it.
- **Hash Chaining mechanism:** Every time an event is logged, the system computes a SHA-256 hash containing the event's data *combined* with the hash of the immediately preceding event.
- **Blockchain Principle:** This creates an unbroken mathematical chain. Altering any historical log entry will immediately invalidate its hash, breaking the chain for all subsequent entries and alerting auditors to the tampering.

### 2.4 Multi-Factor Authentication: TOTP
**Algorithm:** Time-based One-Time Password (RFC 6238)
**Use Case:** Second-factor authentication for login and transfer verification.
**Rationale:**
- **Phishing Resistance:** Even if an attacker intercepts a user's password, they cannot access the account or move funds without physical access to the user's secondary device (e.g., a mobile phone running Google Authenticator).
- **Offline Generation:** TOTP relies on a shared secret and the current UNIX time. It does not require the user's device to have an internet connection to generate valid codes, drastically improving user experience and reliability.

---

## 3. Database Architecture & Defense

### 3.1 Raw SQL with Parameterization
**Technologies:** `aiomysql` (Asynchronous MySQL Driver)
**Rationale:**
- **SQLi Prevention:** The system utilizes strict parameterized queries. By explicitly separating the SQL structure from the user-provided data parameters at the database driver level, it becomes physically impossible for a malicious actor to inject executable SQL commands (SQL Injection).
- **Performance & Control:** By bypassing a heavy Object-Relational Mapper (ORM), the backend maintains complete, fine-grained control over complex queries (like the transaction ledger and hash chains), optimizing latency for high-frequency financial operations.
