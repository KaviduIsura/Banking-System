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

def send_security_alert(to_email: str, ip_address: str):
    """Sends an alert when a login from a new IP is detected."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "465")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not all([smtp_host, smtp_user, smtp_pass]):
        logger.warning("SMTP credentials not configured. Skipping security alert email.")
        return

    msg = EmailMessage()
    msg.set_content(f"Security Alert: A new login was detected from IP address {ip_address}. If this was not you, please freeze your account immediately.")
    msg['Subject'] = 'Security Alert: New Login Detected'
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        with smtplib.SMTP_SSL(smtp_host, int(smtp_port)) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            logger.info(f"Security alert email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send security alert email: {e}")

def send_account_frozen_email(to_email: str):
    """Sends an alert when an account is automatically frozen due to excessive failed logins."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "465")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not all([smtp_host, smtp_user, smtp_pass]):
        logger.warning("SMTP credentials not configured. Skipping frozen account email.")
        return

    msg = EmailMessage()
    msg.set_content("Security Alert: Your account has been permanently frozen due to repeated failed login attempts. Please contact administration to verify your identity and unlock your account.")
    msg['Subject'] = 'Account Frozen - Action Required'
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        with smtplib.SMTP_SSL(smtp_host, int(smtp_port)) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            logger.info(f"Account frozen email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send frozen account email: {e}")

def send_welcome_email(to_email: str, full_name: str):
    """Sends a welcome email to a newly registered user."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "465")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not all([smtp_host, smtp_user, smtp_pass]):
        logger.warning("SMTP credentials not configured. Skipping welcome email.")
        return

    msg = EmailMessage()
    first_name = full_name.split()[0] if full_name else "Customer"
    msg.set_content(f"Hello {first_name},\n\nWelcome to SecureBank! Your account has been successfully created.\n\nPlease log in to set up your multi-factor authentication (MFA).\n\nBest regards,\nThe SecureBank Team")
    msg['Subject'] = 'Welcome to SecureBank'
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        with smtplib.SMTP_SSL(smtp_host, int(smtp_port)) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            logger.info(f"Welcome email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")

def send_password_reset_email(to_email: str, reset_link: str):
    """Sends a password reset link to the user."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "465")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not all([smtp_host, smtp_user, smtp_pass]):
        logger.warning("SMTP credentials not configured. Skipping password reset email.")
        return

    msg = EmailMessage()
    msg.set_content(f"You requested a password reset.\n\nPlease click the link below to reset your password. This link is valid for 15 minutes.\n\n{reset_link}\n\nIf you did not request this, please ignore this email.")
    msg['Subject'] = 'Password Reset Request'
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        with smtplib.SMTP_SSL(smtp_host, int(smtp_port)) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            logger.info(f"Password reset email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
