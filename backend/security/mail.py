import os
import smtplib
from email.message import EmailMessage
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def _get_base_html(title: str, body_html: str) -> str:
    """Generates a premium, responsive HTML email template."""
    year = datetime.now().year
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155; line-height: 1.6; margin: 0;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 4px solid #10b981;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">SecureBank</h1>
            </div>
            <div style="padding: 35px;">
                <h2 style="color: #0f172a; font-size: 20px; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">{title}</h2>
                <div style="font-size: 16px; margin-top: 20px;">
                    {body_html}
                </div>
            </div>
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0;">
                &copy; {year} SecureBank Core Systems.<br>This is an automated security message. Please do not reply.
            </div>
        </div>
    </body>
    </html>
    """

def _send_email(to_email: str, subject: str, title: str, plain_text: str, html_body: str):
    """Helper to send dual-payload (plaintext + HTML) emails via SMTPS."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "465")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not all([smtp_host, smtp_user, smtp_pass]):
        logger.warning(f"SMTP credentials not configured. Skipping email to {to_email}.")
        return

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = to_email
    
    # Set plaintext version
    msg.set_content(plain_text)
    
    # Add premium HTML version
    html_content = _get_base_html(title, html_body)
    msg.add_alternative(html_content, subtype='html')

    try:
        # CW2 Requirement: Protocol level - Secure Mail using SMTPS
        with smtplib.SMTP_SSL(smtp_host, int(smtp_port)) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            logger.info(f"Email '{subject}' sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email '{subject}': {e}")


def send_transfer_confirmation(to_email: str, amount: str, to_account: str):
    """Sends a transfer confirmation email using SMTPS (Implicit TLS)."""
    plain_text = f"Your transfer of {amount} to account {to_account} was successful."
    html_body = f"""
        <p>Your recent fund transfer has been processed successfully.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> <span style="color: #10b981; font-weight: bold; font-size: 18px;">{amount}</span></p>
            <p style="margin: 0;"><strong>Recipient Account:</strong> {to_account}</p>
        </div>
        <p>Thank you for banking with us.</p>
    """
    _send_email(to_email, "Transfer Confirmation", "Transfer Successful", plain_text, html_body)


def send_security_alert(to_email: str, ip_address: str):
    """Sends an alert when a login from a new IP is detected."""
    plain_text = f"Security Alert: A new login was detected from IP address {ip_address}. If this was not you, please freeze your account immediately."
    html_body = f"""
        <p>We detected a new sign-in to your SecureBank account from an unrecognized IP address.</p>
        <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #be123c;"><strong>IP Address:</strong> {ip_address}</p>
        </div>
        <p>If this was you, you can safely ignore this email.</p>
        <p style="font-weight: bold; color: #e11d48;">If this was NOT you, please log in immediately and use the "Freeze Account" kill switch in your dashboard.</p>
    """
    _send_email(to_email, "Security Alert: New Login Detected", "New Sign-In Detected", plain_text, html_body)


def send_account_frozen_email(to_email: str):
    """Sends an alert when an account is automatically frozen due to excessive failed logins."""
    plain_text = "Security Alert: Your account has been permanently frozen due to repeated failed login attempts. Please contact administration to verify your identity and unlock your account."
    html_body = """
        <p style="color: #e11d48; font-weight: bold;">CRITICAL SECURITY ALERT</p>
        <p>Your account has been <strong>permanently frozen</strong> due to excessive consecutive failed login attempts.</p>
        <p>This is a preventative security measure to protect your funds against brute-force and credential-stuffing attacks.</p>
        <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <strong>Next Steps:</strong> You will not be able to log in or transfer funds. Please contact your system administrator to verify your identity and unfreeze your account.
        </div>
    """
    _send_email(to_email, "Account Frozen - Action Required", "Account Frozen", plain_text, html_body)


def send_welcome_email(to_email: str, full_name: str):
    """Sends a welcome email to a newly registered user."""
    first_name = full_name.split()[0] if full_name else "Customer"
    plain_text = f"Hello {first_name},\n\nWelcome to SecureBank! Your account has been successfully created.\n\nPlease log in to set up your multi-factor authentication (MFA)."
    html_body = f"""
        <p>Hello <strong>{first_name}</strong>,</p>
        <p>Welcome to SecureBank! Your core banking account has been successfully created and provisioned.</p>
        <p>To ensure maximum security for your funds, your next step is to log in and configure your Multi-Factor Authentication (MFA) using an authenticator app.</p>
        <a href="https://localhost:5173/login" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 15px;">Log In to SecureBank</a>
    """
    _send_email(to_email, "Welcome to SecureBank", "Welcome to SecureBank", plain_text, html_body)


def send_password_reset_email(to_email: str, reset_link: str):
    """Sends a password reset link to the user."""
    plain_text = f"You requested a password reset.\n\nPlease click the link below to reset your password. This link is valid for 15 minutes.\n\n{reset_link}\n\nIf you did not request this, please ignore this email."
    html_body = f"""
        <p>We received a request to reset the password for your SecureBank account.</p>
        <p>Click the button below to securely set a new password. This secure link is valid for exactly <strong>15 minutes</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="display: inline-block; background-color: #0f172a; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; letter-spacing: 0.5px;">Reset My Password</a>
        </div>
        <p style="font-size: 14px; color: #64748b;">If you did not request this change, you can safely ignore this email. Your account remains completely secure.</p>
    """
    _send_email(to_email, "Password Reset Request", "Password Reset", plain_text, html_body)
