import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

# Main connection pool (root/admin — for user management, registration, etc.)
pool = pooling.MySQLConnectionPool(
    pool_name="securebank_main",
    pool_size=5,
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", 3306)),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME", "securebank"),
    ssl_verify_cert=True,
    ssl_verify_identity=True,
    ssl_ca=os.getenv("DB_SSL_CA", "/etc/ssl/cert.pem"),
    autocommit=False
)


def get_connection():
    """Returns a connection from the main pool."""
    return pool.get_connection()
