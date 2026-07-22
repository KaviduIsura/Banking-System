import os
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_dev_endpoints_accessible_in_dev():
    # Ensure ENVIRONMENT is not production
    os.environ["ENVIRONMENT"] = "development"
    
    # Test /dev/get-token without valid creds to ensure we get 401, not 404
    response = client.post("/dev/get-token", json={"email": "invalid@test.com", "password": "wrong"})
    assert response.status_code == 401

    # Test /dev/setup-mfa
    response = client.post("/dev/setup-mfa", json={"email": "invalid@test.com", "password": "wrong"})
    assert response.status_code == 401

def test_dev_endpoints_blocked_in_prod():
    # Set ENVIRONMENT to production
    os.environ["ENVIRONMENT"] = "production"
    
    # Test /dev/get-token
    response = client.post("/dev/get-token", json={"email": "test@test.com", "password": "password"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}

    # Test /dev/setup-mfa
    response = client.post("/dev/setup-mfa", json={"email": "test@test.com", "password": "password"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}

    # Cleanup
    os.environ["ENVIRONMENT"] = "development"
