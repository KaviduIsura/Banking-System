"""
Control Point G (protocol level) — TOTP Multi-Factor Authentication.
Uses HMAC-SHA1 with a 30-second time window (RFC 6238 / TOTP standard).
The MFA secret is stored AES-256-GCM encrypted in the database — see field_crypto.py.
A valid_window=1 tolerates up to 30 seconds of client clock drift.
"""
import pyotp
import qrcode
import io
import base64


def generate_mfa_secret() -> str:
    """Generate a cryptographically random base32 TOTP secret."""
    return pyotp.random_base32()


def get_qr_code_base64(secret: str, email: str) -> str:
    """
    Generate a QR code URI for Google Authenticator / Authy enrollment.
    Returns a base64-encoded PNG string suitable for embedding in HTML:
    <img src="data:image/png;base64,{result}">
    """
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name="SecureBank"
    )
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def verify_totp(secret: str, code: str) -> bool:
    """
    Verify a 6-digit TOTP code.
    valid_window=1 allows the previous and next 30-second windows
    to account for clock skew between client and server.
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def get_totp_uri(secret: str, email: str) -> str:
    """Return the raw provisioning URI (useful for testing)."""
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name="SecureBank"
    )
