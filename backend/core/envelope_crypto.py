"""Envelope encryption helper · Iter 31 · F4 simplified.

Per §47.6 + §76 Privacy pillar · operator wires real KMS (AWS KMS · GCP
KMS · Vault) at the master-key boundary. This helper uses Fernet for the
data key + a master key in env for the wrap layer.

PATTERN:
  · master_key = env INSUR_MASTER_KEY (base64-encoded 32-byte secret)
  · For each blob: generate a fresh data_key, encrypt blob with data_key,
    encrypt data_key with master_key. Store (encrypted_data_key, ciphertext).
  · Decrypt: unwrap data_key with master_key, then decrypt blob.

Per §57.7: dev fallback master key when env not set · production must
override.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets

try:
    from cryptography.fernet import Fernet
    _HAS_FERNET = True
except ImportError:
    _HAS_FERNET = False


def _get_master_key() -> bytes:
    raw = os.environ.get("INSUR_MASTER_KEY")
    if raw:
        try:
            decoded = base64.urlsafe_b64decode(raw)
            if len(decoded) >= 32:
                return decoded[:32]
        except Exception:
            pass
    # Dev fallback · derived from a fixed phrase · operator MUST override
    return hashlib.sha256(b"insur-dev-master-key-do-not-ship").digest()


def _xor(a: bytes, b: bytes) -> bytes:
    """XOR-encrypt a with key b (b repeated to a's length)."""
    return bytes(x ^ b[i % len(b)] for i, x in enumerate(a))


def _wrap_key(data_key: bytes, master_key: bytes) -> bytes:
    """Simple key-wrap: XOR + HMAC tag · operator wires real KMS for prod."""
    wrapped = _xor(data_key, master_key)
    tag = hmac.new(master_key, wrapped, hashlib.sha256).digest()[:16]
    return tag + wrapped


def _unwrap_key(blob: bytes, master_key: bytes) -> bytes:
    tag, wrapped = blob[:16], blob[16:]
    expected = hmac.new(master_key, wrapped, hashlib.sha256).digest()[:16]
    if not hmac.compare_digest(tag, expected):
        raise ValueError("envelope key unwrap failed · master_key mismatch")
    return _xor(wrapped, master_key)


def encrypt(plaintext: bytes | str) -> dict:
    """Encrypt with a fresh data key · returns {encrypted_data_key, ciphertext, alg}."""
    if isinstance(plaintext, str):
        plaintext = plaintext.encode()
    master_key = _get_master_key()
    data_key = secrets.token_bytes(32)
    if _HAS_FERNET:
        # Fernet expects URL-safe base64 32-byte key
        f = Fernet(base64.urlsafe_b64encode(data_key))
        ct = f.encrypt(plaintext)
        alg = "fernet+wrap"
    else:
        # Per §57.7 fallback: XOR + HMAC tag · scaffold encryption only
        ct = _xor(plaintext, data_key) + hmac.new(data_key, plaintext, hashlib.sha256).digest()[:16]
        alg = "xor-hmac+wrap (scaffold · install cryptography for Fernet)"
    wrapped = _wrap_key(data_key, master_key)
    return {
        "encrypted_data_key": base64.urlsafe_b64encode(wrapped).decode(),
        "ciphertext": base64.urlsafe_b64encode(ct).decode(),
        "alg": alg,
    }


def decrypt(envelope: dict) -> bytes:
    """Decrypt an envelope · raises ValueError on tag mismatch."""
    master_key = _get_master_key()
    wrapped = base64.urlsafe_b64decode(envelope["encrypted_data_key"])
    data_key = _unwrap_key(wrapped, master_key)
    ct = base64.urlsafe_b64decode(envelope["ciphertext"])
    alg = envelope.get("alg", "")
    if alg.startswith("fernet"):
        f = Fernet(base64.urlsafe_b64encode(data_key))
        return f.decrypt(ct)
    # XOR fallback
    payload, tag = ct[:-16], ct[-16:]
    plaintext = _xor(payload, data_key)
    expected = hmac.new(data_key, plaintext, hashlib.sha256).digest()[:16]
    if not hmac.compare_digest(tag, expected):
        raise ValueError("envelope ciphertext integrity check failed")
    return plaintext
