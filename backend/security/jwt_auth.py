"""
Control Point E (protocol level) — JWT RS256 authentication.
RS256 uses asymmetric cryptography: private key signs tokens, public key verifies.
This means the public key can be shared with any microservice for verification
without exposing the signing secret (unlike HS256 which uses a shared secret).
"""
import jwt
import datetime
import os
from fastapi import Depends, HTTPException, Header

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(BASE_DIR, "keys", "private.pem"), "r") as f:
    PRIVATE_KEY = f.read()

with open(os.path.join(BASE_DIR, "keys", "public.pem"), "r") as f:
    PUBLIC_KEY = f.read()

TOKEN_EXPIRY_MINUTES = 15  # Short-lived tokens — industry best practice


def issue_jwt(user_id: int, role: str = "customer") -> str:
    """
    Issue a short-lived (15 min) RS256 JWT.
    Payload includes: subject (user_id), role, issued-at, expiry.
    """
    now = datetime.datetime.utcnow()
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + datetime.timedelta(minutes=TOKEN_EXPIRY_MINUTES)
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm="RS256")


def verify_jwt(token: str) -> dict:
    """
    Verify and decode a JWT using the RSA public key.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure.
    """
    return jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])


def require_auth(authorization: str = Header(...)) -> dict:
    """
    FastAPI dependency — extracts and validates JWT from Authorization header.
    Protects routes as a lightweight API gateway (Control Point E).
    Usage: @app.get("/protected") def route(auth=Depends(require_auth))
    """
    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
        return verify_jwt(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing token")


def require_admin(auth: dict = Depends(require_auth)) -> dict:
    """FastAPI dependency — requires admin role."""
    if auth.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return auth
