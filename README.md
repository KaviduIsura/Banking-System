# SecureBank (Truba Bank Theme)

A highly secure, professional banking prototype application built with a React frontend and a FastAPI backend. This project features strong cryptographic security, Multi-Factor Authentication (MFA), an immutable audit log, and a beautiful, responsive UI.

## Features

- **Modern UI/UX:** A stunning "Truba Bank" aesthetic with a responsive dashboard, interactive charts, and clean data tables.
- **Robust Security:**
  - Password hashing using Argon2.
  - JWT-based authentication.
  - Time-based One-Time Password (TOTP) Multi-Factor Authentication (MFA).
  - Cryptographically signed and immutable Admin Audit Logs.
  - Strict Rate Limiting and Intrusion Detection System (IDS) simulated flags.
- **Admin Dashboard:** Isolated dashboard for administrators to view system events and approve/reject pending transfers.
- **Transfers & History:** Secure internal money transfers requiring MFA verification, with a detailed transaction history.

## Prerequisites

Before running the application, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **Python** (v3.10 or higher)
- **MySQL Server** (v8.0 or higher)

## Project Setup

### 1. Database Setup (MySQL)
1. Start your local MySQL server.
2. Log in as the root user: `mysql -u root -p`
3. The application will automatically create the database `secure_bank` if you run the schema script, but you must ensure the credentials in your `.env` file match your MySQL setup.

### 2. Backend Setup (FastAPI)
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` directory with the following variables:
   ```env
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_HOST=localhost
   DB_NAME=secure_bank
   JWT_SECRET=your_super_secret_jwt_key
   ```
5. Initialize the Database and create an Admin user:
   ```bash
   # Initialize the tables
   mysql -u root -p < schema.sql
   
   # Run the admin creation script
   python create_admin.py
   ```
6. Generate SSL Certificates (Required for secure cookies and MFA):
   ```bash
   mkdir keys
   openssl req -x509 -newkey rsa:4096 -keyout keys/server.key -out keys/server.crt -days 365 -nodes
   ```
7. Run the FastAPI server:
   ```bash
   uvicorn main:app --port 8443 --ssl-keyfile keys/server.key --ssl-certfile keys/server.crt --reload
   ```
   The backend will be available at `https://localhost:8443`

### 3. Frontend Setup (React/Vite)
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

## Usage
- **Customer:** Register a new account from the home page. You will be provided an MFA secret (QR Code). Scan this with Google Authenticator or Authy to log in and authorize transfers.
- **Admin:** Log in using the admin credentials created via the `create_admin.py` script. You will be redirected to the secure Audit Log and Pending Transfers dashboard.

## Documentation
- Refer to `API_DOCUMENTATION.md` for endpoint details.
- Refer to `SECURITY_DOCUMENTATION.md` for a breakdown of the security architecture.
