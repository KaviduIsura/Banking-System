"""
SecureBank — FastAPI Application
=================================
Control points implemented:
  A  — SlowAPI rate limiting on /login (brute-force protection)
  E  — JWT RS256 API gateway (require_auth dependency)
  G  — Argon2id password hashing + TOTP MFA
  H  — Least-privilege DB users (documented in schema.sql)
  I  — AES-256-GCM field encryption (MFA secret, national ID)
  J  — ECDSA transaction signing + HMAC-SHA256 integrity
  Audit — audit_log table populated on every significant event
"""

import datetime
import random
import string
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from middleware.ids_monitor import IDSMonitorMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
import re
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from db import get_connection
from security.password import hash_password, verify_password
from security.jwt_auth import issue_jwt, require_auth, require_admin
from security.mfa import generate_mfa_secret, get_qr_code_base64, verify_totp
from security.mail import send_transfer_confirmation, send_security_alert
from security.field_crypto import encrypt_field, decrypt_field
from security.tx_signing import sign_transaction, compute_hmac, verify_transaction_signature

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="SecureBank API",
    description="Secure banking API demonstrating CW2 control points A–L",
    version="1.0.0"
)

# System-level requirement: Simulated IDS/Firewall
app.add_middleware(IDSMonitorMiddleware)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "https://localhost:5173",
        "https://banking-system-jet-delta.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MAX_FAILED_LOGINS = 5
LOCKOUT_MINUTES = 15


def _generate_account_number() -> str:
    """Generate a random 12-digit account number."""
    return "SB" + "".join(random.choices(string.digits, k=10))


def _audit(event_type: str, user_id: int | None, detail: str, ip: str = ""):
    """Write an entry to the audit_log table."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO audit_log (event_type, user_id, detail, ip_address) VALUES (%s,%s,%s,%s)",
            (event_type, user_id, detail, ip)
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    national_id: str | None = None
    full_name: str
    date_of_birth: str  # YYYY-MM-DD
    phone_number: str
    address: str

    @field_validator('password')
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", v):
            raise ValueError('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.')
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class MfaVerifyRequest(BaseModel):
    user_id: int
    code: str


class TransferRequest(BaseModel):
    to_account_number: str
    amount_cents: int
    mfa_code: str
    note: str | None = Field(None, pattern=r"^[a-zA-Z0-9\s\-_.,!]*$")


class BalanceRequest(BaseModel):
    pass


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """Health check — no auth required."""
    return {"status": "ok", "service": "SecureBank API"}


# --- Registration -----------------------------------------------------------

@app.post("/register", status_code=201)
def register(req: RegisterRequest, request: Request):
    """
    Register a new user and create their bank account.
    Passwords hashed with Argon2id (Control Point G).
    National ID encrypted with AES-256-GCM if provided (Control Point I).
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check for duplicate email
        cursor.execute("SELECT id FROM users WHERE email = %s", (req.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Email already registered")

        password_hash = hash_password(req.password)

        # Insert user with profile details
        cursor.execute(
            """
            INSERT INTO users (email, password_hash, full_name, date_of_birth, phone_number, address) 
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (req.email, password_hash, req.full_name, req.date_of_birth, req.phone_number, req.address)
        )
        conn.commit()
        user_id = cursor.lastrowid

        # Create bank account (balance_cents is removed from accounts table)
        account_number = _generate_account_number()
        national_id_enc = encrypt_field(req.national_id) if req.national_id else None
        cursor.execute(
            "INSERT INTO accounts (user_id, account_number, national_id_encrypted) VALUES (%s,%s,%s)",
            (user_id, account_number, national_id_enc)
        )
        conn.commit()
        account_id = cursor.lastrowid

        # Re-enabled welcome bonus for testing purposes (10,000 GBP = 1,000,000 cents)
        # Added via Double-Entry Ledger
        cursor.execute(
            "INSERT INTO ledger (account_id, credit_cents, debit_cents, description) VALUES (%s, %s, %s, %s)",
            (account_id, 1000000, 0, "Welcome Bonus")
        )
        conn.commit()

        ip = request.client.host if request.client else ""
        _audit("REGISTER", user_id, f"New account created: {account_number}", ip)

        return {
            "message": "Registration successful",
            "account_number": account_number,
            "welcome_balance": "LKR10,000.00"
        }
    finally:
        cursor.close()
        conn.close()


# --- Login (Step 1) ---------------------------------------------------------

@app.post("/login")
@limiter.limit("5/15minutes")   # Control Point A — brute-force protection
def login(req: LoginRequest, request: Request):
    """
    Step 1 of 2-factor login: email + password.
    Returns mfa_required=True if credentials are valid.
    Account lockout after 5 failed attempts (Control Point A).
    """
    ip = request.client.host if request.client else ""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (req.email,))
        user = cursor.fetchone()

        if not user:
            _audit("LOGIN_FAIL", None, f"Unknown email: {req.email}", ip)
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Check for freeze
        if user["is_frozen"]:
            _audit("LOGIN_FAIL_FROZEN", user["id"], "Attempted login to frozen account", ip)
            raise HTTPException(status_code=423, detail="Account is frozen. Please contact support.")

        # Check account lockout
        if user["locked_until"] and user["locked_until"] > datetime.datetime.utcnow():
            remaining = (user["locked_until"] - datetime.datetime.utcnow()).seconds // 60
            raise HTTPException(
                status_code=423,
                detail=f"Account locked. Try again in {remaining} minutes."
            )

        # Verify password
        if not verify_password(user["password_hash"], req.password):
            failed = user["failed_logins"] + 1
            if failed >= MAX_FAILED_LOGINS:
                locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=LOCKOUT_MINUTES)
                cursor.execute(
                    "UPDATE users SET failed_logins=%s, locked_until=%s WHERE id=%s",
                    (failed, locked_until, user["id"])
                )
                conn.commit()
                _audit("ACCOUNT_LOCKED", user["id"], f"Locked after {failed} failed attempts", ip)
                raise HTTPException(status_code=423, detail="Account locked due to too many failed attempts")
            else:
                cursor.execute("UPDATE users SET failed_logins=%s WHERE id=%s", (failed, user["id"]))
                conn.commit()
                _audit("LOGIN_FAIL", user["id"], f"Failed attempt {failed}/{MAX_FAILED_LOGINS}", ip)
                raise HTTPException(status_code=401, detail="Invalid credentials")

        # Track IP and send alert if it's a new IP
        if user["last_ip"] and user["last_ip"] != ip:
            send_security_alert(req.email, ip)
            _audit("SECURITY_ALERT", user["id"], f"New IP login detected: {ip}", ip)

        # Credentials valid — reset failed counter and update IP
        cursor.execute(
            "UPDATE users SET failed_logins=0, locked_until=NULL, last_ip=%s WHERE id=%s",
            (ip, user["id"])
        )
        conn.commit()

        _audit("LOGIN_STEP1", user["id"], "Password verified, MFA required", ip)

        return {
            "mfa_required": True,
            "mfa_enabled": bool(user["mfa_enabled"]),
            "user_id": user["id"]
        }
    finally:
        cursor.close()
        conn.close()


# --- MFA Setup --------------------------------------------------------------

@app.post("/mfa/setup")
def mfa_setup(request: Request, auth: dict = Depends(require_auth)):
    """
    Generate and store an encrypted TOTP secret for the authenticated user.
    Returns a base64 QR code PNG for scanning with Google Authenticator.
    The secret is encrypted with AES-256-GCM before storing (Control Point I).
    """
    user_id = int(auth["sub"])
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT email FROM users WHERE id=%s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        secret = generate_mfa_secret()
        secret_encrypted = encrypt_field(secret)

        cursor.execute(
            "UPDATE users SET mfa_secret_encrypted=%s, mfa_enabled=FALSE WHERE id=%s",
            (secret_encrypted, user_id)
        )
        conn.commit()

        qr_base64 = get_qr_code_base64(secret, user["email"])
        ip = request.client.host if request.client else ""
        _audit("MFA_SETUP", user_id, "MFA secret generated", ip)

        return {
            "qr_code": qr_base64,
            "message": "Scan this QR code with Google Authenticator, then call /mfa/confirm"
        }
    finally:
        cursor.close()
        conn.close()


# --- MFA Confirm (enable after first scan) ----------------------------------

@app.post("/mfa/confirm")
@limiter.limit("5/minute")
def mfa_confirm(req: MfaVerifyRequest, request: Request):
    """
    Confirm MFA setup by verifying the first TOTP code.
    Marks mfa_enabled=TRUE in the database.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT mfa_secret_encrypted FROM users WHERE id=%s",
            (req.user_id,)
        )
        user = cursor.fetchone()
        if not user or not user["mfa_secret_encrypted"]:
            raise HTTPException(status_code=400, detail="MFA not set up")

        secret = decrypt_field(user["mfa_secret_encrypted"])
        if not verify_totp(secret, req.code):
            ip = request.client.host if request.client else ""
            _audit("MFA_CONFIRM_FAIL", req.user_id, "Invalid TOTP on confirmation", ip)
            raise HTTPException(status_code=401, detail="Invalid TOTP code")

        cursor.execute("UPDATE users SET mfa_enabled=TRUE WHERE id=%s", (req.user_id,))
        conn.commit()

        ip = request.client.host if request.client else ""
        _audit("MFA_ENABLED", req.user_id, "MFA successfully enabled", ip)
        return {"message": "MFA enabled successfully"}
    finally:
        cursor.close()
        conn.close()


# --- MFA Confirm (authenticated — for Dashboard flow) ----------------------

class MfaConfirmAuthRequest(BaseModel):
    code: str


@app.post("/mfa/confirm-auth")
@limiter.limit("5/minute")
def mfa_confirm_auth(req: MfaConfirmAuthRequest, request: Request, auth: dict = Depends(require_auth)):
    """
    Confirm MFA setup for an already-authenticated user (Dashboard flow).
    Uses JWT auth instead of requiring user_id in the request body.
    """
    user_id = int(auth["sub"])
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT mfa_secret_encrypted FROM users WHERE id=%s",
            (user_id,)
        )
        user = cursor.fetchone()
        if not user or not user["mfa_secret_encrypted"]:
            raise HTTPException(status_code=400, detail="MFA not set up — call /mfa/setup first")

        secret = decrypt_field(user["mfa_secret_encrypted"])
        if not verify_totp(secret, req.code):
            ip = request.client.host if request.client else ""
            _audit("MFA_CONFIRM_FAIL", user_id, "Invalid TOTP on dashboard confirmation", ip)
            raise HTTPException(status_code=401, detail="Invalid TOTP code")

        cursor.execute("UPDATE users SET mfa_enabled=TRUE WHERE id=%s", (user_id,))
        conn.commit()

        ip = request.client.host if request.client else ""
        _audit("MFA_ENABLED", user_id, "MFA enabled via dashboard", ip)
        return {"message": "MFA enabled successfully"}
    finally:
        cursor.close()
        conn.close()


# --- MFA Verify (Login Step 2) ----------------------------------------------

@app.post("/mfa/verify")
@limiter.limit("10/minute")
def mfa_verify(req: MfaVerifyRequest, request: Request):
    """
    Step 2 of 2-factor login: verify TOTP code.
    Issues the full RS256 JWT on success (Control Point E).
    """
    ip = request.client.host if request.client else ""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, role, mfa_secret_encrypted, mfa_enabled FROM users WHERE id=%s",
            (req.user_id,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user["mfa_enabled"] or not user["mfa_secret_encrypted"]:
            raise HTTPException(status_code=400, detail="MFA not configured")

        secret = decrypt_field(user["mfa_secret_encrypted"])
        if not verify_totp(secret, req.code):
            _audit("MFA_FAIL", req.user_id, "Invalid TOTP code during login", ip)
            raise HTTPException(status_code=401, detail="Invalid MFA code")

        token = issue_jwt(user["id"], user["role"])
        _audit("LOGIN_SUCCESS", req.user_id, "Full 2FA login successful", ip)

        return {"access_token": token, "token_type": "bearer"}
    finally:
        cursor.close()
        conn.close()


# --- Balance ----------------------------------------------------------------

@app.get("/balance")
def get_balance(request: Request, auth: dict = Depends(require_auth)):
    """
    Return the authenticated user's account balance.
    Protected by JWT (Control Point E).
    """
    user_id = int(auth["sub"])
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get account number and KYC status
        cursor.execute(
            """
            SELECT a.id, a.account_number, u.kyc_status 
            FROM accounts a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.user_id=%s
            """,
            (user_id,)
        )
        account = cursor.fetchone()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Calculate balance from ledger
        cursor.execute(
            "SELECT COALESCE(SUM(credit_cents), 0) - COALESCE(SUM(debit_cents), 0) as balance_cents FROM ledger WHERE account_id=%s",
            (account["id"],)
        )
        ledger_result = cursor.fetchone()
        balance_cents = int(ledger_result["balance_cents"]) if ledger_result else 0

        return {
            "account_number": account["account_number"],
            "balance_cents": balance_cents,
            "balance_display": f"LKR{balance_cents / 100:.2f}",
            "kyc_status": account.get("kyc_status", "pending")
        }
    finally:
        cursor.close()
        conn.close()

# --- Profile ----------------------------------------------------------------

@app.get("/user/profile")
def get_user_profile(request: Request, auth: dict = Depends(require_auth)):
    """Return the authenticated user's profile information."""
    user_id = int(auth["sub"])
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT full_name, email, date_of_birth, phone_number, address, kyc_status, role FROM users WHERE id=%s",
            (user_id,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert date to string safely if present
        if user.get("date_of_birth"):
            user["date_of_birth"] = str(user["date_of_birth"])
            
        return user
    finally:
        cursor.close()
        conn.close()


# --- Transfer ---------------------------------------------------------------

@app.post("/transfer")
@limiter.limit("10/minute")
def transfer(req: TransferRequest, request: Request, auth: dict = Depends(require_auth)):
    """
    Transfer funds between accounts.
    Protected by JWT (Control Point E).
    ECDSA signature + HMAC-SHA256 tag stored per transaction (Control Points I & J).
    Atomic balance update prevents race conditions.
    """
    user_id = int(auth["sub"])
    ip = request.client.host if request.client else ""

    if req.amount_cents <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get sender's account and calculate balance from ledger
        cursor.execute(
            "SELECT id FROM accounts WHERE user_id=%s",
            (user_id,)
        )
        from_account = cursor.fetchone()
        if not from_account:
            raise HTTPException(status_code=404, detail="Sender account not found")

        cursor.execute(
            "SELECT COALESCE(SUM(credit_cents), 0) - COALESCE(SUM(debit_cents), 0) as balance_cents FROM ledger WHERE account_id=%s",
            (from_account["id"],)
        )
        ledger_result = cursor.fetchone()
        from_balance = int(ledger_result["balance_cents"]) if ledger_result else 0

        # Get recipient's account
        cursor.execute(
            "SELECT id FROM accounts WHERE account_number=%s",
            (req.to_account_number,)
        )
        to_account = cursor.fetchone()
        if not to_account:
            raise HTTPException(status_code=404, detail="Recipient account not found")

        if from_account["id"] == to_account["id"]:
            raise HTTPException(status_code=400, detail="Cannot transfer to same account")

        if from_balance < req.amount_cents:
            raise HTTPException(status_code=400, detail="Insufficient funds")

        # Fetch user status, KYC, and MFA secret
        cursor.execute("SELECT mfa_secret_encrypted, is_frozen, kyc_status FROM users WHERE id=%s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user["is_frozen"]:
            raise HTTPException(status_code=423, detail="Account is frozen. Cannot transfer funds.")
        if user.get("kyc_status") != "verified":
            raise HTTPException(status_code=403, detail="Account pending KYC verification. Please upload ID.")
        if not user["mfa_secret_encrypted"]:
            raise HTTPException(status_code=400, detail="MFA not configured")

        # Verify transaction OTP
        secret = decrypt_field(user["mfa_secret_encrypted"])
        if not verify_totp(secret, req.mfa_code):
            _audit("TRANSFER_MFA_FAIL", user_id, "Invalid TOTP for transaction", ip)
            raise HTTPException(status_code=401, detail="Invalid transaction OTP")

        # Build transaction data for signing
        tx_data = {
            "from_account_id": from_account["id"],
            "to_account_id": to_account["id"],
            "amount_cents": req.amount_cents,
            "note": req.note
        }
        signature = sign_transaction(tx_data)    # ECDSA (Control Point J)
        tag = compute_hmac(tx_data)              # HMAC-SHA256 (Control Point I)

        # Fraud Rules Engine (Threshold: LKR5,000)
        is_fraud_flagged = req.amount_cents > 500000
        tx_status = "pending_review" if is_fraud_flagged else "completed"

        # Record transaction (Double-entry principle step 1)
        cursor.execute(
            "INSERT INTO transactions (from_account, to_account, amount_cents, signature, hmac_tag, status) VALUES (%s,%s,%s,%s,%s,%s)",
            (from_account["id"], to_account["id"], req.amount_cents, signature, tag, tx_status)
        )
        tx_id = cursor.lastrowid

        if is_fraud_flagged:
            conn.commit()
            amount_display = f"LKR{req.amount_cents / 100:.2f}"
            _audit("FRAUD_FLAG", user_id, f"Transfer of {amount_display} flagged for admin review", ip)
            return {
                "message": "Transfer flagged for security review. It will process once approved by an administrator.",
                "amount": amount_display,
                "status": "pending_review",
                "to_account": req.to_account_number
            }

        # Double-entry ledger update (only if not flagged)
        # 1. Debit sender
        cursor.execute(
            "INSERT INTO ledger (transaction_id, account_id, credit_cents, debit_cents, description) VALUES (%s, %s, %s, %s, %s)",
            (tx_id, from_account["id"], 0, req.amount_cents, f"Transfer to {req.to_account_number}")
        )
        
        # 2. Credit receiver
        cursor.execute(
            "INSERT INTO ledger (transaction_id, account_id, credit_cents, debit_cents, description) VALUES (%s, %s, %s, %s, %s)",
            (tx_id, to_account["id"], req.amount_cents, 0, f"Transfer from user {user_id}")
        )
        
        conn.commit()

        amount_display = f"LKR{req.amount_cents / 100:.2f}"
        _audit("TRANSFER", user_id, f"Sent {amount_display} to {req.to_account_number}", ip)

        # Get sender email for notification
        cursor.execute("SELECT email FROM users WHERE id=%s", (user_id,))
        user_row = cursor.fetchone()
        if user_row and user_row.get("email"):
            send_transfer_confirmation(user_row["email"], amount_display, req.to_account_number)

        return {
            "message": "Transfer successful",
            "amount": amount_display,
            "signature": signature,
            "to_account": req.to_account_number
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# --- Transaction History ----------------------------------------------------

@app.get("/transactions")
def get_transactions(auth: dict = Depends(require_auth)):
    """Return the last 20 transactions for the authenticated user's account."""
    user_id = int(auth["sub"])
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM accounts WHERE user_id=%s", (user_id,))
        account = cursor.fetchone()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        account_id = account["id"]
        cursor.execute(
            """
            SELECT t.id, t.amount_cents, t.created_at, t.status,
                   fa.account_number AS from_account,
                   ta.account_number AS to_account
            FROM transactions t
            JOIN accounts fa ON t.from_account = fa.id
            JOIN accounts ta ON t.to_account = ta.id
            WHERE t.from_account = %s OR t.to_account = %s
            ORDER BY t.created_at DESC
            LIMIT 20
            """,
            (account_id, account_id)
        )
        rows = cursor.fetchall()
        for row in rows:
            row["amount_display"] = f"LKR{row['amount_cents'] / 100:.2f}"
            row["created_at"] = str(row["created_at"])
            # Mark as credit or debit from user's perspective
            row["type"] = "debit" if row["from_account"] == account_id else "credit"
        return {"transactions": rows}
    finally:
        cursor.close()
        conn.close()


# --- Admin: Audit Log -------------------------------------------------------

@app.get("/admin/audit-log")
def get_audit_log(auth: dict = Depends(require_admin)):
    """Return the last 100 audit log entries — admin only."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100"
        )
        rows = cursor.fetchall()
        for row in rows:
            row["created_at"] = str(row["created_at"])
        return {"audit_log": rows}
    finally:
        cursor.close()
        conn.close()

# --- Freeze Account ---------------------------------------------------------

@app.post("/freeze-account")
def freeze_account(request: Request, auth: dict = Depends(require_auth)):
    """Kill switch to instantly freeze the authenticated account."""
    user_id = int(auth["sub"])
    ip = request.client.host if request.client else ""
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET is_frozen=TRUE WHERE id=%s", (user_id,))
        conn.commit()
        
        _audit("ACCOUNT_FROZEN", user_id, "User activated kill switch", ip)
        
        return {"message": "Account has been frozen."}
    finally:
        cursor.close()
        conn.close()



# ---------------------------------------------------------------------------
# DEV / TESTING HELPERS  (remove before production)
# ---------------------------------------------------------------------------

class DevTokenRequest(BaseModel):
    email: str
    password: str

def require_not_production():
    import os
    if os.getenv("ENVIRONMENT") == "production":
        raise HTTPException(status_code=404, detail="Not Found")

@app.post("/dev/get-token", tags=["dev"], dependencies=[Depends(require_not_production)])
def dev_get_token(req: DevTokenRequest):
    """
    DEV ONLY — Issues a JWT token after verifying password, WITHOUT requiring MFA.
    Use this to get a token for calling /mfa/setup in Swagger during first-time setup.
    DELETE THIS ENDPOINT before production deployment.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (req.email,))
        user = cursor.fetchone()
        if not user or not verify_password(user["password_hash"], req.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = issue_jwt(user["id"], user["role"])
        return {"access_token": token, "token_type": "bearer", "user_id": user["id"]}
    finally:
        cursor.close()
        conn.close()


class DevSetupMfaRequest(BaseModel):
    email: str
    password: str


@app.post("/dev/setup-mfa", tags=["dev"], dependencies=[Depends(require_not_production)])
def dev_setup_mfa(req: DevSetupMfaRequest):
    """
    DEV ONLY — Generates a TOTP secret and returns the QR code + plain secret
    without requiring an existing JWT. Use this during initial MFA enrollment.
    After scanning, confirm with POST /mfa/confirm using the user_id + code.
    DELETE THIS ENDPOINT before production deployment.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (req.email,))
        user = cursor.fetchone()
        if not user or not verify_password(user["password_hash"], req.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        secret = generate_mfa_secret()
        secret_encrypted = encrypt_field(secret)

        cursor.execute(
            "UPDATE users SET mfa_secret_encrypted=%s, mfa_enabled=FALSE WHERE id=%s",
            (secret_encrypted, user["id"])
        )
        conn.commit()

        qr_base64 = get_qr_code_base64(secret, user["email"])
        return {
            "user_id": user["id"],
            "qr_code_base64": qr_base64,
            "secret_plaintext": secret,  # for manual entry in authenticator app
            "next_step": "Scan QR or enter secret in Google Authenticator, then POST /mfa/confirm with user_id + 6-digit code"
        }
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Enterprise Endpoints (KYC & Fraud Engine)
# ---------------------------------------------------------------------------

@app.post("/user/verify-kyc")
def verify_kyc(request: Request, auth: dict = Depends(require_auth)):
    """Simulates automated ID verification (Onfido/Jumio)"""
    user_id = int(auth["sub"])
    ip = request.client.host if request.client else ""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET kyc_status='verified' WHERE id=%s", (user_id,))
        conn.commit()
        _audit("KYC_VERIFIED", user_id, "User ID verification successful", ip)
        return {"message": "Identity verified successfully. You can now transfer funds."}
    finally:
        cursor.close()
        conn.close()

@app.get("/admin/transactions/pending")
def admin_get_pending_tx(request: Request, auth: dict = Depends(require_admin)):
    """Admin fetches all pending fraud transactions."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM transactions WHERE status='pending_review' ORDER BY created_at DESC")
        transactions = cursor.fetchall()
        return {"pending_transactions": transactions}
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/transactions/{tx_id}/approve")
def admin_approve_tx(tx_id: int, request: Request, auth: dict = Depends(require_admin)):
    """Admin approves a transaction flagged for fraud."""
    admin_id = int(auth["sub"])
    ip = request.client.host if request.client else ""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM transactions WHERE id=%s AND status='pending_review'", (tx_id,))
        tx = cursor.fetchone()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found or not pending.")

        # Insert double-entry ledger records
        cursor.execute(
            "INSERT INTO ledger (transaction_id, account_id, credit_cents, debit_cents, description) VALUES (%s, %s, %s, %s, %s)",
            (tx["id"], tx["from_account"], 0, tx["amount_cents"], f"Transfer to account {tx['to_account']}")
        )
        cursor.execute(
            "INSERT INTO ledger (transaction_id, account_id, credit_cents, debit_cents, description) VALUES (%s, %s, %s, %s, %s)",
            (tx["id"], tx["to_account"], tx["amount_cents"], 0, f"Transfer from account {tx['from_account']}")
        )
        
        # Update status
        cursor.execute("UPDATE transactions SET status='completed' WHERE id=%s", (tx_id,))
        conn.commit()

        _audit("FRAUD_APPROVE", admin_id, f"Approved flagged transaction {tx_id}", ip)
        return {"message": "Transaction approved and funds settled."}
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/transactions/{tx_id}/reject")
def admin_reject_tx(tx_id: int, request: Request, auth: dict = Depends(require_admin)):
    """Admin rejects a flagged transaction."""
    admin_id = int(auth["sub"])
    ip = request.client.host if request.client else ""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE transactions SET status='rejected' WHERE id=%s AND status='pending_review'", (tx_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Transaction not found or not pending.")
        conn.commit()
        _audit("FRAUD_REJECT", admin_id, f"Rejected flagged transaction {tx_id}", ip)
        return {"message": "Transaction rejected."}
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Entry point (for running without uvicorn CLI)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    import ssl

    # CW2 Requirement: Protocol Level (Protocol Tightening)
    # Why TLS 1.3? TLS 1.3 enforces Perfect Forward Secrecy (PFS), meaning that even if 
    # the server's private key is compromised in the future, past intercepted traffic 
    # cannot be decrypted. It also removes obsolete, vulnerable cryptographic primitives.

    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(certfile="keys/server.cert", keyfile="keys/server.key")
    ssl_context.minimum_version = ssl.TLSVersion.TLSv1_3

    config = uvicorn.Config("main:app", host="0.0.0.0", port=8443, reload=True)
    # Apply the strict TLS 1.3 context manually since uvicorn.run doesn't expose minimum_version
    server = uvicorn.Server(config)
    config.ssl = ssl_context
    
    server.run()
