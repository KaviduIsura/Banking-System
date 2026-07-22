CREATE DATABASE IF NOT EXISTS securebank;
USE securebank;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  mfa_secret_encrypted TEXT,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'customer',
  failed_logins INT DEFAULT 0,
  locked_until DATETIME NULL,
  last_ip VARCHAR(45) NULL,
  is_frozen BOOLEAN DEFAULT FALSE,
  kyc_status VARCHAR(20) DEFAULT 'pending',
  full_name VARCHAR(255) NULL,
  date_of_birth DATE NULL,
  phone_number VARCHAR(20) NULL,
  address TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  account_number VARCHAR(20) UNIQUE NOT NULL,
  national_id_encrypted TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_account INT,
  to_account INT,
  amount_cents BIGINT NOT NULL,
  signature TEXT NOT NULL,
  hmac_tag TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_account) REFERENCES accounts(id),
  FOREIGN KEY (to_account) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT,
  account_id INT NOT NULL,
  credit_cents BIGINT DEFAULT 0,
  debit_cents BIGINT DEFAULT 0,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id INT,
  detail TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Least-privilege DB users (Control Point H)
CREATE USER IF NOT EXISTS 'account_service'@'%' IDENTIFIED BY 'AccountSvc@2024!';
GRANT SELECT, UPDATE ON securebank.accounts TO 'account_service'@'%';
GRANT SELECT ON securebank.ledger TO 'account_service'@'%';

CREATE USER IF NOT EXISTS 'transaction_service'@'%' IDENTIFIED BY 'TxSvc@2024!';
GRANT SELECT, INSERT, UPDATE ON securebank.transactions TO 'transaction_service'@'%';
GRANT SELECT ON securebank.accounts TO 'transaction_service'@'%';
GRANT SELECT, INSERT ON securebank.ledger TO 'transaction_service'@'%';
GRANT INSERT ON securebank.audit_log TO 'transaction_service'@'%';

FLUSH PRIVILEGES;
