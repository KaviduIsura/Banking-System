import logging
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_ids_monitor_normal_request(caplog):
    caplog.set_level(logging.INFO)
    response = client.get("/health")
    assert response.status_code == 200
    
    # Check that normal request is logged as INFO and not WARNING
    assert "SUSPICIOUS_REQUEST" not in caplog.text
    assert "IDS_LOG" in caplog.text
    assert "/health" in caplog.text

def test_ids_monitor_suspicious_request(caplog):
    caplog.set_level(logging.WARNING)
    # Simulate a path traversal attempt
    response = client.get("/health?q=../../etc/passwd")
    
    # Check that suspicious request emits a WARNING
    assert "SUSPICIOUS_REQUEST detected" in caplog.text
    assert "../../etc/passwd" in caplog.text
    
    # The request should still be processed (since this is just a detective control)
    assert response.status_code == 200

def test_ids_monitor_sqli_request(caplog):
    caplog.set_level(logging.WARNING)
    # Simulate an SQL injection attempt
    response = client.get("/health?q=UNION SELECT * FROM users")
    
    assert "SUSPICIOUS_REQUEST detected" in caplog.text
    assert "UNION SELECT" in caplog.text
