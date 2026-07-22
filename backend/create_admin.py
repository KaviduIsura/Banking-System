import os
from db import get_connection
from security.password import hash_password

def create_admin():
    email = "admin@securebank.com"
    password = "AdminPassword123!"
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        password_hash = hash_password(password)
        cursor.execute(
            "INSERT INTO users (email, password_hash, role, kyc_status) VALUES (%s, %s, 'admin', 'verified')",
            (email, password_hash)
        )
        conn.commit()
        print(f"Admin user created!\nEmail: {email}\nPassword: {password}")
    except Exception as e:
        print(f"Failed to create admin: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_admin()
