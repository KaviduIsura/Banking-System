import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_mfa_confirm_ratelimit():
    # Attempt to hit /mfa/confirm more than 5 times
    for i in range(5):
        response = client.post("/mfa/confirm", json={"user_id": 1, "code": "000000"})
        # Should be 400 or 401 because the code is wrong or MFA not set up
        assert response.status_code in [400, 401]
    
    # The 6th attempt should be rate limited (429)
    response = client.post("/mfa/confirm", json={"user_id": 1, "code": "000000"})
    assert response.status_code == 429
    assert "Rate limit exceeded" in response.text
