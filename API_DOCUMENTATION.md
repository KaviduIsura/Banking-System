# SecureBank API Documentation

This document outlines the RESTful endpoints provided by the SecureBank FastAPI backend.

## Base URL
`https://localhost:8443` (Development)

## Authentication
Most endpoints require authentication via a JWT Bearer token. The token must be passed in the `Authorization` header:
`Authorization: Bearer <token>`

---

## 1. Authentication Endpoints

### 1.1 Register Customer
**Endpoint:** `POST /register`  
**Description:** Registers a new customer account, generates a unique account number, and sets up the MFA secret.  
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "date_of_birth": "1990-01-01",
  "phone_number": "123-456-7890",
  "address": "123 Main St, City, Country"
}
```
**Response (200 OK):**
```json
{
  "message": "User registered successfully",
  "mfa_secret": "JBSWY3DPEHPK3PXP",
  "mfa_uri": "otpauth://totp/SecureBank:user@example.com?secret=..."
}
```

### 1.2 Login (Initial Step)
**Endpoint:** `POST /login`  
**Description:** Validates credentials. If successful, returns the User ID necessary for the MFA verification step.  
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```
**Response (200 OK):**
```json
{
  "message": "Credentials verified. MFA required.",
  "user_id": 1,
  "role": "customer"
}
```

### 1.3 Verify MFA
**Endpoint:** `POST /mfa/verify`  
**Description:** Verifies the 6-digit TOTP code and issues the JWT access token.  
**Request Body:**
```json
{
  "user_id": 1,
  "code": "123456"
}
```
**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "token_type": "bearer",
  "role": "customer"
}
```

---

## 2. Customer Dashboard & Accounts

### 2.1 Get Balance
**Endpoint:** `GET /balance`  
**Headers:** `Authorization: Bearer <token>`  
**Description:** Retrieves the current available balance and account number of the authenticated user.  
**Response (200 OK):**
```json
{
  "balance_cents": 500000,
  "account_number": "SB987654321"
}
```

### 2.2 Get Profile
**Endpoint:** `GET /profile`  
**Headers:** `Authorization: Bearer <token>`  
**Description:** Retrieves the profile details (Name, DOB, Phone, Address) of the authenticated user.  
**Response (200 OK):**
```json
{
  "full_name": "John Doe",
  "date_of_birth": "1990-01-01",
  "phone_number": "123-456-7890",
  "address": "123 Main St, City, Country"
}
```

### 2.3 Freeze Account
**Endpoint:** `POST /freeze`  
**Headers:** `Authorization: Bearer <token>`  
**Description:** Immediately locks the user's account for security reasons (e.g., lost card or suspected breach). The user is forcefully logged out.  
**Response (200 OK):**
```json
{
  "message": "Account frozen successfully"
}
```

---

## 3. Transactions

### 3.1 Initiate Transfer
**Endpoint:** `POST /transfer`  
**Headers:** `Authorization: Bearer <token>`  
**Description:** Transfers funds to a recipient account. Requires a valid 6-digit MFA code. Large transfers (>= £1000) are placed in a `pending_review` state for admin approval.  
**Request Body:**
```json
{
  "to_account": "SB123456789",
  "amount_cents": 25000,
  "mfa_code": "123456",
  "note": "Dinner split"
}
```
**Response (200 OK):**
```json
{
  "status": "completed",
  "message": "Transfer successful",
  "amount": "£250.00",
  "to_account": "SB123456789"
}
```

### 3.2 Get Transaction History
**Endpoint:** `GET /transactions`  
**Headers:** `Authorization: Bearer <token>`  
**Description:** Retrieves a chronological list of all debits and credits associated with the user's account.  
**Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": 101,
      "type": "debit",
      "amount_cents": 25000,
      "amount_display": "250.00",
      "to_account": "SB123456789",
      "from_account": "SB987654321",
      "note": "Dinner split",
      "created_at": "2026-07-22T12:00:00Z"
    }
  ]
}
```

---

## 4. Admin Operations (Requires Admin Token)

### 4.1 Get Audit Log
**Endpoint:** `GET /admin/audit-log`  
**Headers:** `Authorization: Bearer <token>`  
**Description:** Retrieves the cryptographically secured, immutable system event log.  
**Response (200 OK):**
```json
{
  "audit_log": [
    {
      "id": 1,
      "event_type": "LOGIN_SUCCESS",
      "user_id": 1,
      "ip_address": "127.0.0.1",
      "details": "User logged in successfully",
      "created_at": "2026-07-22T10:00:00Z",
      "hash_chain": "abc123xyz..."
    }
  ]
}
```

### 4.2 Get Pending Transactions
**Endpoint:** `GET /admin/pending-transactions`  
**Headers:** `Authorization: Bearer <token>`  
**Description:** Retrieves a list of transfers that exceeded the automated threshold and require manual review.  
**Response (200 OK):**
```json
{
  "pending_transactions": [
    {
      "id": 45,
      "from_account": "SB987654321",
      "to_account": "SB123456789",
      "amount_cents": 1500000,
      "created_at": "2026-07-22T14:30:00Z"
    }
  ]
}
```

### 4.3 Approve Transaction
**Endpoint:** `POST /admin/approve-transaction/{tx_id}`  
**Headers:** `Authorization: Bearer <token>`  
**Description:** Approves a pending transaction, settling the funds.  
**Response (200 OK):**
```json
{
  "message": "Transaction approved"
}
```

### 4.4 Reject Transaction
**Endpoint:** `POST /admin/reject-transaction/{tx_id}`  
**Headers:** `Authorization: Bearer <token>`  
**Description:** Rejects a pending transaction. Funds remain in the sender's account.  
**Response (200 OK):**
```json
{
  "message": "Transaction rejected"
}
```
