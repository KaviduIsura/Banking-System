import { useState, useEffect } from "react";
import {
  getBalance,
  getTransactions,
  transfer,
  setupMfa,
  confirmMfa,
  setToken,
  clearToken,
} from "./api";

/**
 * Dashboard — shows balance, transfer form, and transaction history.
 * Also provides MFA setup panel for newly registered accounts.
 */
export default function Dashboard({ email, onLogout }) {
  const [balance, setBalance] = useState(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Transfer form state
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txMsg, setTxMsg] = useState("");
  const [txError, setTxError] = useState("");

  // MFA setup state
  const [mfaPanel, setMfaPanel] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMsg, setMfaMsg] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  // Fetch account data on mount
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [balRes, txRes] = await Promise.all([
        getBalance(),
        getTransactions(),
      ]);
      setBalance(balRes.data.balance_cents);
      setAccountNumber(balRes.data.account_number);
      setTransactions(txRes.data.transactions);
    } catch (err) {
      console.error("Failed to load account data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Transfer ──────────────────────────────────────────────────────────
  const handleTransfer = async () => {
    setTxMsg("");
    setTxError("");
    if (!toAccount.trim()) {
      setTxError("Enter recipient account number");
      return;
    }
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents <= 0) {
      setTxError("Enter a valid amount");
      return;
    }

    setTxLoading(true);
    try {
      const res = await transfer(toAccount.trim(), amountCents);
      setTxMsg(`✅ Transferred ${res.data.amount} to ${res.data.to_account}`);
      setToAccount("");
      setAmount("");
      await fetchAll(); // Refresh balance + tx list
    } catch (err) {
      setTxError(err.response?.data?.detail || "Transfer failed");
    } finally {
      setTxLoading(false);
    }
  };

  // ── MFA Setup ─────────────────────────────────────────────────────────
  const handleMfaSetup = async () => {
    setMfaError("");
    setMfaMsg("");
    setMfaLoading(true);
    try {
      const res = await setupMfa();
      setQrCode(res.data.qr_code);
    } catch (err) {
      setMfaError(
        err.response?.data?.detail || "Failed to generate MFA QR code",
      );
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaConfirm = async () => {
    setMfaError("");
    if (mfaCode.length !== 6) {
      setMfaError("Enter 6-digit code");
      return;
    }
    setMfaLoading(true);
    try {
      // Get user_id from JWT sub (stored in token claim)
      // We'll call confirmMfa with userId=0 placeholder — backend uses JWT sub
      // Actually we need to send user_id — get from balance endpoint or store it
      // For simplicity: use a workaround endpoint call without user_id since we have JWT
      const res = await import("./api").then((m) =>
        m.default.post("/mfa/confirm-auth", { code: mfaCode }),
      );
      setMfaMsg("🔐 MFA enabled successfully!");
      setQrCode(null);
      setMfaCode("");
      setMfaPanel(false);
    } catch (err) {
      setMfaError(err.response?.data?.detail || "Invalid code");
    } finally {
      setMfaLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearToken();
    onLogout();
  };

  // ── Helpers ───────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-layout">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-brand-icon">🏦</div>
          SecureBank
        </div>
        <div className="navbar-actions">
          <span className="navbar-email">{email}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setMfaPanel(!mfaPanel)}
          >
            🔐 MFA Setup
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
              color: "var(--text-secondary)",
            }}
          >
            <span
              className="spinner"
              style={{ width: 32, height: 32, borderWidth: 3 }}
            />
            <p style={{ marginTop: 16 }}>Loading your account…</p>
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <div className="balance-card">
              <p className="balance-label">Available Balance</p>
              <p className="balance-amount">
                LKR
                {(balance / 100).toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="balance-account">Account: {accountNumber}</p>
            </div>

            {/* MFA Setup Panel */}
            {mfaPanel && (
              <div className="card card-gradient">
                <p className="section-title">
                  <span>🔐</span> Set Up Two-Factor Authentication
                </p>
                {mfaError && (
                  <div className="alert alert-error">{mfaError}</div>
                )}
                {mfaMsg && <div className="alert alert-success">{mfaMsg}</div>}
                {!qrCode ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleMfaSetup}
                    disabled={mfaLoading}
                  >
                    {mfaLoading ? (
                      <span className="spinner" />
                    ) : (
                      "Generate QR Code"
                    )}
                  </button>
                ) : (
                  <>
                    <div className="qr-wrapper">
                      <img
                        src={`data:image/png;base64,${qrCode}`}
                        alt="MFA QR Code"
                      />
                      <p
                        style={{
                          color: "#333",
                          fontSize: "0.75rem",
                          textAlign: "center",
                        }}
                      >
                        Scan with Google Authenticator or Authy
                      </p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Enter code to confirm
                      </label>
                      <input
                        id="mfa-confirm-dashboard-input"
                        className="form-input otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={mfaCode}
                        onChange={(e) =>
                          setMfaCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                      />
                    </div>
                    <button
                      id="mfa-confirm-dashboard-btn"
                      className="btn btn-success"
                      onClick={handleMfaConfirm}
                      disabled={mfaLoading || mfaCode.length !== 6}
                    >
                      {mfaLoading ? (
                        <span className="spinner" />
                      ) : (
                        "Enable MFA ✓"
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Transfer Form */}
            <div className="card">
              <p className="section-title">
                <span>💸</span> Send Money
              </p>
              {txError && <div className="alert alert-error">{txError}</div>}
              {txMsg && <div className="alert alert-success">{txMsg}</div>}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Recipient Account No.</label>
                  <input
                    id="transfer-to-account"
                    className="form-input"
                    type="text"
                    placeholder="SB1234567890"
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Amount (LKR)</label>
                  <input
                    id="transfer-amount"
                    className="form-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTransfer();
                    }}
                  />
                </div>
              </div>
              <button
                id="transfer-submit-btn"
                className="btn btn-success"
                onClick={handleTransfer}
                disabled={txLoading}
              >
                {txLoading ? <span className="spinner" /> : "Transfer Funds →"}
              </button>
            </div>

            {/* Transaction History */}
            <div className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <p className="section-title" style={{ marginBottom: 0 }}>
                  <span>📋</span> Recent Transactions
                </p>
                <button className="btn btn-ghost btn-sm" onClick={fetchAll}>
                  ↻ Refresh
                </button>
              </div>
              {transactions.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  No transactions yet
                </p>
              ) : (
                <div className="tx-list">
                  {transactions.map((tx) => (
                    <div className="tx-item" key={tx.id}>
                      <div className="tx-left">
                        <div className={`tx-icon ${tx.type}`}>
                          {tx.type === "debit" ? "↑" : "↓"}
                        </div>
                        <div className="tx-info">
                          <p className="tx-title">
                            {tx.type === "debit"
                              ? `To ${tx.to_account}`
                              : `From ${tx.from_account}`}
                          </p>
                          <p className="tx-date">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>
                      <span className={`tx-amount ${tx.type}`}>
                        {tx.type === "debit" ? "-" : "+"}
                        {tx.amount_display}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
