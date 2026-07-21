"""
Control Point G (algorithm level) — Argon2id password hashing.
Uses OWASP-recommended parameters: time_cost=2, memory_cost=19456 (~19 MB), parallelism=1.
Argon2id is preferred over bcrypt because it is memory-hard and resistant to both
side-channel and GPU/ASIC attacks.
"""
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

# OWASP recommended Argon2id configuration
ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,   # 19 MB RAM per hash — GPU-resistant
    parallelism=1,
    hash_len=32,
    salt_len=16
)


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return ph.hash(plain_password)


def verify_password(stored_hash: str, plain_password: str) -> bool:
    """
    Verify a password against its stored Argon2id hash.
    Returns False on mismatch — never raises to the caller.
    """
    try:
        return ph.verify(stored_hash, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False
