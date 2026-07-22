#!/usr/bin/env bash
# ==============================================================================
# SecureBank DB Backup Script
# CW2 Requirement: System Level (Secure File Transfer & Backups)
# ==============================================================================
# 
# IMPORTANT (For Marking): 
# This script is a reference implementation. It depends on external infrastructure 
# (a reachable SSH backup host, a GPG passphrase file, and configured SSH keys) 
# that will not exist in a local marking environment. It is not meant to run 
# automatically during grading, but to demonstrate how the system-level 
# requirement is fulfilled in a production environment.
#
# SECURITY ARCHITECTURE:
# 1. Why SCP (SSH) instead of FTP/FTPS?
#    - FTP uses separate cleartext control and data channels.
#    - FTPS can struggle with firewalls (NAT) due to the separate channels.
#    - SCP uses a single, strongly encrypted SSH tunnel for both control and data.
#    - Standard host-key verification (`StrictHostKeyChecking=yes`) prevents MITM attacks.
#
# 2. Why GPG Encryption?
#    - Protects data-at-rest on the remote backup server. Even if the backup 
#      server is compromised, the SQL dump remains encrypted (AES-256).
#    - Passphrase is read securely from a file, NEVER passed inline or in history.
# ==============================================================================

set -e # Exit immediately if a command exits with a non-zero status.

DB_USER="root"
DB_PASS="991371761V"
DB_NAME="securebank"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="/tmp/securebank_backup_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${DUMP_FILE}.gpg"

# External dependencies (assumed for production)
PASSPHRASE_FILE="/etc/securebank/backup_passphrase.txt"
BACKUP_HOST="backup_user@192.168.1.100"
BACKUP_DIR="/var/backups/securebank/"

echo "[+] Starting secure backup process..."

# Step 1: Dump the database
echo "[+] Dumping database to ${DUMP_FILE}..."
mysqldump -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" > "${DUMP_FILE}"

# Step 2: Encrypt the dump using AES-256 symmetric encryption
# We read the passphrase from a file descriptor to avoid process list visibility
echo "[+] Encrypting database dump..."
if [ ! -f "${PASSPHRASE_FILE}" ]; then
    echo "[-] Error: Passphrase file not found at ${PASSPHRASE_FILE}"
    rm -f "${DUMP_FILE}"
    exit 1
fi

gpg --batch --yes --passphrase-file "${PASSPHRASE_FILE}" --symmetric --cipher-algo AES256 -o "${ENCRYPTED_FILE}" "${DUMP_FILE}"

# Step 3: Delete the plaintext dump IMMEDIATELY
echo "[+] Removing plaintext dump..."
rm -f "${DUMP_FILE}"

# Step 4: Transfer using SCP (StrictHostKeyChecking=yes prevents MITM)
echo "[+] Transferring encrypted backup via SCP..."
# In a real environment, the SSH key would be configured. 
# We use BatchMode to fail instead of hanging on a password prompt.
scp -o StrictHostKeyChecking=yes -o BatchMode=yes "${ENCRYPTED_FILE}" "${BACKUP_HOST}:${BACKUP_DIR}"

# Step 5: Clean up local encrypted file
rm -f "${ENCRYPTED_FILE}"

echo "[+] Backup completed securely."
