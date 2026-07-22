import os
import smtplib
from email.message import EmailMessage
import logging

logger = logging.getLogger(__name__)

def send_transfer_confirmation(to_email: str, amount: str, to_account: str):
    """
    Sends a transfer confirmation email using SMTPS (Implicit TLS).
    
    Why Implicit TLS (Port 465)?
    Unlike STARTTLS (Port 587) which begins in plaintext and upgrades, 
    Implicit TLS encrypts the connection before any SMTP commands are sent. 
    This protects against active downgrade attacks that strip the STARTTLS command.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "465")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not all([smtp_host, smtp_user, smtp_pass]):
        logger.warning("SMTP credentials not fully configured in .env. Skipping email.")
        return

    msg = EmailMessage()
    msg.set_content(f"Your transfer of {amount} to account {to_account} was successful.")
    msg['Subject'] = 'Transfer Confirmation'
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        # CW2 Requirement: Protocol level - Secure Mail using SMTPS
        with smtplib.SMTP_SSL(smtp_host, int(smtp_port)) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            logger.info(f"Transfer confirmation email sent to {to_email}")
    except Exception as e:
        # Email is best-effort. We log the failure but do not raise it,
        # ensuring the database transaction is not rolled back.
        logger.error(f"Failed to send transfer confirmation email: {e}")
