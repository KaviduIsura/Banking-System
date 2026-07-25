import os
import smtplib
from email.message import EmailMessage
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# EMAIL PROVIDER DETECTION
# ─────────────────────────────────────────────────────────────────────────────
# If BREVO_API_KEY is set in .env, the Brevo API (HTTPS) is used.
# This bypasses the SMTP port 465/587 blocks on cloud providers.
# Locally, if only SMTP credentials are present, raw SMTPS is used as a fallback.
# ─────────────────────────────────────────────────────────────────────────────

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


def _send_via_brevo(to_email: str, subject: str, html_content: str, plain_text: str):
    """
    Sends email via the Brevo (Sendinblue) API over HTTPS.
    Bypasses Render's SMTP block and allows sending to ANY email address.
    """
    import requests
    api_key = os.getenv("BREVO_API_KEY")
    from_email = os.getenv("BREVO_FROM_EMAIL", "kaviduisura4567@gmail.com")

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    payload = {
        "sender": {"name": "SecureBank", "email": from_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": plain_text
    }
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code in (200, 201, 202):
        logger.info(f"Email '{subject}' sent via Brevo API to {to_email}.")
    else:
        logger.error(f"Brevo API error: {response.text}")


def _send_via_smtp(to_email: str, subject: str, html_content: str, plain_text: str):
    """
    Sends email via SMTPS Implicit TLS (Port 465).
    
    CW2 Requirement: Protocol level — Secure Mail using SMTPS.
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
        logger.warning(f"SMTP credentials not configured. Cannot send '{subject}' to {to_email}.")
        return

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg.set_content(plain_text)
    msg.add_alternative(html_content, subtype='html')

    with smtplib.SMTP_SSL(smtp_host, int(smtp_port)) as server:
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        logger.info(f"Email '{subject}' sent via SMTPS to {to_email}")


def _send_email(to_email: str, subject: str, title: str, plain_text: str, html_body: str):
    """
    Master email dispatcher.
    
    Routing logic:
    1. If BREVO_API_KEY is set → use Brevo API (works on hosted servers, no port blocks).
    2. Else if SMTP credentials are set → use SMTPS/Implicit TLS (works locally).
    3. Else → log a warning and skip (dev mode with no email configured).
    
    This dual-mode design ensures the system works in both local and hosted environments.
    """
    html_content = _get_base_html(title, html_body)

    try:
        if os.getenv("BREVO_API_KEY"):
            logger.info(f"Email provider: Brevo API (hosted mode)")
            _send_via_brevo(to_email, subject, html_content, plain_text)
        elif os.getenv("SMTP_HOST"):
            logger.info(f"Email provider: SMTPS (local mode)")
            _send_via_smtp(to_email, subject, html_content, plain_text)
        else:
            logger.warning(
                "No email provider configured. Set BREVO_API_KEY (hosted) or "
                "SMTP_HOST/SMTP_USER/SMTP_PASS (local) in your .env file."
            )
    except Exception as e:
        # Email is best-effort. We log the failure but do not raise it,
        # ensuring the database transaction is not rolled back due to an email error.
        logger.error(f"Failed to send email '{subject}' to {to_email}: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC EMAIL FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def send_transfer_confirmation(to_email: str, amount: str, to_account: str):
    """Sends a transfer confirmation email."""
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
    """Sends an alert when an account is permanently frozen."""
    plain_text = "Security Alert: Your account has been permanently frozen due to repeated failed login attempts. Please contact administration to unlock your account."
    html_body = """
        <p style="color: #e11d48; font-weight: bold;">CRITICAL SECURITY ALERT</p>
        <p>Your account has been <strong>permanently frozen</strong> due to excessive consecutive failed login attempts.</p>
        <p>This is a preventative security measure to protect your funds against brute-force attacks.</p>
        <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <strong>Next Steps:</strong> You will not be able to log in or transfer funds. Please contact your system administrator to verify your identity and unfreeze your account.
        </div>
    """
    _send_email(to_email, "Account Frozen - Action Required", "Account Frozen", plain_text, html_body)


def send_welcome_email(to_email: str, full_name: str):
    """Sends a welcome email to a newly registered user."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    first_name = full_name.split()[0] if full_name else "Customer"
    plain_text = f"Hello {first_name},\n\nWelcome to SecureBank! Your account has been successfully created.\n\nPlease log in to set up your multi-factor authentication (MFA)."
    html_body = f"""
        <p>Hello <strong>{first_name}</strong>,</p>
        <p>Welcome to SecureBank! Your core banking account has been successfully created and provisioned.</p>
        <p>To ensure maximum security for your funds, your next step is to log in and configure your Multi-Factor Authentication (MFA) using an authenticator app.</p>
        <a href="{frontend_url}/login" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 15px;">Log In to SecureBank</a>
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
