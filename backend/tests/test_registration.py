import random
import string
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_registration_no_welcome_balance():
    # Generate a random email to avoid duplicate key errors
    random_str = "".join(random.choices(string.ascii_lowercase, k=8))
    email = f"test_{random_str}@securebank.com"
    
    response = client.post("/register", json={
        "email": email,
        "password": "SecurePass123!",
        "national_id": "123456789V"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "Registration successful"
    
    # Assert the welcome balance has been zeroed out
    assert data["welcome_balance"] == "LKR0.00"
