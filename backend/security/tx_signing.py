"""
Control Points I & J (algorithm level) — ECDSA transaction signing + HMAC-SHA256.

Two complementary integrity mechanisms:
1. ECDSA (prime256v1 / P-256):
   - Asymmetric signature — the private key signs, the public key verifies.
   - Simulates an HSM signing key: only the backend holds the private key.
   - Proves a transaction was authorised by this system (non-repudiation).

2. HMAC-SHA256:
   - Symmetric integrity tag — fast to compute, used as a secondary check.
   - Detects any in-transit or in-DB modification of the transaction record.

IMPORTANT: json.dumps(..., sort_keys=True) is required to ensure deterministic
serialisation — the same dict must always produce the same bytes for
signature verification to work.
"""
import json
import hmac
import hashlib
import base64
import os
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.exceptions import InvalidSignature
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(BASE_DIR, "keys", "ec_private.pem"), "rb") as f:
    EC_PRIVATE_KEY = serialization.load_pem_private_key(f.read(), password=None)

with open(os.path.join(BASE_DIR, "keys", "ec_public.pem"), "rb") as f:
    EC_PUBLIC_KEY = serialization.load_pem_public_key(f.read())

_raw_hmac_key = os.getenv("HMAC_KEY")
if not _raw_hmac_key:
    raise RuntimeError("HMAC_KEY is not set in environment")
HMAC_KEY = bytes.fromhex(_raw_hmac_key)


def _serialize(tx_data: dict) -> bytes:
    """Deterministic JSON serialisation — sort_keys prevents ordering bugs."""
    return json.dumps(tx_data, sort_keys=True).encode("utf-8")


def sign_transaction(tx_data: dict) -> str:
    """
    Sign transaction data with ECDSA (P-256 / SHA-256).
    Returns base64-encoded DER signature.
    """
    message = _serialize(tx_data)
    signature = EC_PRIVATE_KEY.sign(message, ec.ECDSA(hashes.SHA256()))
    return base64.b64encode(signature).decode("utf-8")


def verify_transaction_signature(tx_data: dict, signature_b64: str) -> bool:
    """
    Verify an ECDSA signature against transaction data.
    Returns False on any verification failure (never raises to caller).
    """
    message = _serialize(tx_data)
    signature = base64.b64decode(signature_b64)
    try:
        EC_PUBLIC_KEY.verify(signature, message, ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, Exception):
        return False


def compute_hmac(tx_data: dict) -> str:
    """
    Compute HMAC-SHA256 integrity tag for transaction data.
    Returns base64-encoded tag.
    """
    message = _serialize(tx_data)
    tag = hmac.new(HMAC_KEY, message, hashlib.sha256).digest()
    return base64.b64encode(tag).decode("utf-8")


def verify_hmac(tx_data: dict, tag_b64: str) -> bool:
    """Constant-time HMAC verification (prevents timing attacks)."""
    expected = base64.b64decode(compute_hmac(tx_data))
    provided = base64.b64decode(tag_b64)
    return hmac.compare_digest(expected, provided)
