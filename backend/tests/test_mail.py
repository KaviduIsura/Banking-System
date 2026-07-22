import os
from unittest.mock import patch, MagicMock
from security.mail import send_transfer_confirmation

@patch("security.mail.smtplib.SMTP_SSL")
@patch.dict(os.environ, {"SMTP_HOST": "smtp.test.com", "SMTP_PORT": "465", "SMTP_USER": "testuser", "SMTP_PASS": "testpass"})
def test_send_transfer_confirmation_success(mock_smtp):
    mock_server = MagicMock()
    # The context manager __enter__ should return the mock server
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    send_transfer_confirmation("recipient@test.com", "£50.00", "SB1234567890")
    
    # Assert connection was made
    mock_smtp.assert_called_once_with("smtp.test.com", 465)
    
    # Assert login was called
    mock_server.login.assert_called_once_with("testuser", "testpass")
    
    # Assert send_message was called
    assert mock_server.send_message.called
    msg = mock_server.send_message.call_args[0][0]
    assert msg['Subject'] == 'Transfer Confirmation'
    assert msg['To'] == 'recipient@test.com'
    assert "SB1234567890" in msg.get_content()

@patch("security.mail.smtplib.SMTP_SSL")
@patch.dict(os.environ, {"SMTP_HOST": "smtp.test.com", "SMTP_PORT": "465", "SMTP_USER": "testuser", "SMTP_PASS": "testpass"})
def test_send_transfer_confirmation_exception_handled(mock_smtp):
    # If SMTP_SSL raises an exception, the function should catch it and not crash
    mock_smtp.side_effect = Exception("Connection refused")
    
    # This should not raise an exception
    send_transfer_confirmation("recipient@test.com", "£50.00", "SB1234567890")
    
    mock_smtp.assert_called_once_with("smtp.test.com", 465)
