"""
Control Points I & J (algorithm level) — AES-256-GCM field-level encryption.
Applied to particularly sensitive columns: MFA secret, national ID numbers.

AES-256-GCM provides:
  - Confidentiality (AES-256 symmetric encryption)
  - Integrity + Authentication (GCM tag — detects tampering without a separate HMAC)
  - A unique 96-bit nonce per encryption prevents ciphertext reuse

The KEY is loaded from the FIELD_ENCRYPTION_KEY env variable (32 bytes / 64 hex chars).
In production, this key would be stored in an HSM or cloud KMS, not a flat .env file.
"""
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

load_dotenv()

_raw_key = os.getenv("FIELD_ENCRYPTION_KEY")
if not _raw_key:
    raise RuntimeError("FIELD_ENCRYPTION_KEY is not set in environment")

KEY = bytes.fromhex(_raw_key)  # 32 bytes = 256-bit AES key


def encrypt_field(plaintext: str) -> str:
    """
    Encrypt a string field with AES-256-GCM.
    Output format: base64(nonce[12] + ciphertext+tag)
    The nonce is prepended so it can be extracted on decryption.
    """
    aesgcm = AESGCM(KEY)
    nonce = os.urandom(12)           # 96-bit nonce — unique per encryption
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_field(stored: str) -> str:
    """
    Decrypt an AES-256-GCM encrypted field.
    Raises cryptography.exceptions.InvalidTag if the ciphertext has been tampered with.
    """
    raw = base64.b64decode(stored)
    nonce = raw[:12]
    ciphertext = raw[12:]
    aesgcm = AESGCM(KEY)
    return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
