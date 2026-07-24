import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getBalance, getTransactions, freezeAccount, getProfile } from "../api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

export default function Dashboard() {
  const [balance, setBalance] = useState(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [kycStatus, setKycStatus] = useState("pending");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleCopy = (text, label) => {
    if (text && text !== "N/A") {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    }
  };

  const handleFreeze = () => {
    setShowFreezeModal(true);
  };

  const executeFreeze = async () => {
    try {
      await freezeAccount();
      toast.success("Account frozen successfully.");
      logout();
    } catch (err) {
      toast.error("Failed to freeze account.");
    } finally {
      setShowFreezeModal(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balRes, txRes, profRes] = await Promise.all([
          getBalance(),
          getTransactions(),
          getProfile(),
        ]);
        setBalance(balRes.data.balance_cents);
        setAccountNumber(balRes.data.account_number);
        setKycStatus(balRes.data.kyc_status);
        setProfile(profRes.data);
        setTransactions(txRes.data.transactions.slice(0, 5)); // only last 5
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCents = (cents) => {
    if (cents === null) return { main: "0", decimal: "00" };
    const str = (cents / 100).toFixed(2);
    const [main, decimal] = str.split(".");
    return { main: parseInt(main).toLocaleString("en-GB"), decimal };
  };

  const { main, decimal } = formatCents(balance);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          color: "var(--ink-soft)",
        }}
      >
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.4s ease-out" }}>
      <h2 className="page-title">Overview</h2>

      {kycStatus !== "verified" && (
        <div
          className="alert alert-error"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong>⚠️ Verification Required:</strong> You must verify your
            identity before you can send money.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/verification")}
            style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
          >
            Verify Now
          </button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Left Column: Chart Mock & Flow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            gridColumn: "span 2",
          }}
        >
          <div
            className="card"
            style={{
              height: "320px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.125rem", marginBottom: "0.25rem" }}>
                  Account Analytics
                </h3>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.875rem" }}>
                  Total Available Balance
                </p>
              </div>
              <div
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#F3F4F6",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  color: "var(--ink-soft)",
                }}
              >
                Filter ⌄
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <span style={{ fontSize: "2.5rem", fontWeight: 800 }}>
                LKR{main}.{decimal}
              </span>
              <span
                style={{
                  color: "var(--teal)",
                  backgroundColor: "var(--teal-light)",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                +14% this month
              </span>
            </div>

            {/* CSS Mock Chart */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                padding: "0 1rem",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderTop: "1px dashed #E5E7EB",
                  borderBottom: "1px dashed #E5E7EB",
                  zIndex: 0,
                  opacity: 0.5,
                }}
              ></div>
              {[40, 70, 45, 90, 60, 80, 50, 75, 40].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: "12%",
                    height: `${h}%`,
                    backgroundColor:
                      i === 3 ? "var(--teal)" : "var(--teal-light)",
                    borderRadius: "4px 4px 0 0",
                    zIndex: 1,
                    position: "relative",
                  }}
                >
                  {i === 3 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-30px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#FFF",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        fontWeight: 600,
                      }}
                    >
                      Active
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
            }}
          >
            <div
              className="card widget-teal"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ⭐
                </div>
                <span style={{ fontSize: "1.25rem" }}>•••</span>
              </div>
              <div style={{ marginTop: "2rem" }}>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    marginBottom: "0.25rem",
                  }}
                >
                  {kycStatus === "verified" ? "100%" : "50%"}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "0.875rem",
                  }}
                >
                  Account Setup
                </div>
              </div>
            </div>

            <div
              className="card widget-teal-light"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#FFF",
                    color: "var(--teal)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  📈
                </div>
                <span
                  style={{ fontSize: "1.25rem", color: "var(--teal-dark)" }}
                >
                  •••
                </span>
              </div>
              <div style={{ marginTop: "2rem" }}>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    marginBottom: "0.25rem",
                    color: "var(--teal-dark)",
                  }}
                >
                  {transactions.length}
                </div>
                <div
                  style={{
                    color: "var(--teal-dark)",
                    fontSize: "0.875rem",
                    opacity: 0.8,
                  }}
                >
                  Recent Transactions
                </div>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="card" style={{ marginTop: "auto" }}>
            <h3
              style={{
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "1.125rem",
              }}
            >
              <span style={{ color: "var(--teal)" }}>👤</span> Account Profile
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <div>
                <span
                  style={{
                    color: "var(--ink-soft)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Full Name
                </span>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>{profile?.full_name || "N/A"}</span>
                  {profile?.full_name && (
                    <button
                      onClick={() => handleCopy(profile.full_name, "Full Name")}
                      style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
                      title="Copy Full Name"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--ink-soft)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Date of Birth
                </span>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>{profile?.date_of_birth || "N/A"}</span>
                  {profile?.date_of_birth && (
                    <button
                      onClick={() => handleCopy(profile.date_of_birth, "Date of Birth")}
                      style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
                      title="Copy Date of Birth"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--ink-soft)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Phone
                </span>
                <div
                  style={{
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>{profile?.phone_number || "N/A"}</span>
                  {profile?.phone_number && (
                    <button
                      onClick={() => handleCopy(profile.phone_number, "Phone")}
                      style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
                      title="Copy Phone"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--ink-soft)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Address
                </span>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>{profile?.address || "N/A"}</span>
                  {profile?.address && (
                    <button
                      onClick={() => handleCopy(profile.address, "Address")}
                      style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
                      title="Copy Address"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--ink-soft)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Account Number
                </span>
                <div
                  style={{
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>{accountNumber || "N/A"}</span>
                  {accountNumber && (
                    <button
                      onClick={() => handleCopy(accountNumber, "Account Number")}
                      style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
                      title="Copy Account Number"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "1.5rem",
                borderTop: "1px solid #E5E7EB",
                paddingTop: "1rem",
              }}
            >
              <button
                className="btn btn-ghost"
                style={{
                  color: "var(--danger)",
                  borderColor: "transparent",
                  padding: "0.5rem 0",
                  fontSize: "0.875rem",
                }}
                onClick={handleFreeze}
              >
                ⚠️ Freeze Account
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Card & Operations */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* Credit Card Widget */}
          <div
            className="card widget-dark"
            style={{
              padding: "1.5rem 1.5rem 2rem",
              border: "none",
              borderRadius: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "2rem",
              }}
            >
              <span style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                LKR {main}.{decimal}
              </span>
              <span
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}
              >
                SecureBank
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "1.125rem",
                  letterSpacing: "0.15em",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                •••• •••• •••• {accountNumber ? accountNumber.slice(-4) : "1234"}
              </div>
              {accountNumber && (
                <button
                  onClick={() => handleCopy(accountNumber, "Account Number")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.7)",
                    padding: 0,
                    fontSize: "1.125rem",
                  }}
                  title="Copy Full Account Number"
                >
                  📋
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {profile?.full_name || "Customer Name"}
                </div>
              </div>
              <div style={{ display: "flex" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#EB001B",
                    position: "relative",
                    zIndex: 2,
                  }}
                ></div>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#F79E1B",
                    marginLeft: "-12px",
                    position: "relative",
                    zIndex: 1,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Recent Operations */}
          <div className="card" style={{ flex: 1, padding: "1.5rem 0 0 0" }}>
            <h3
              style={{
                fontSize: "1rem",
                padding: "0 1.5rem 1rem",
                borderBottom: "1px solid #F3F4F6",
                color: "var(--teal)",
              }}
            >
              Recent Operations
            </h3>

            <div style={{ padding: "0.5rem 0" }}>
              {transactions.length === 0 ? (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--ink-soft)",
                  }}
                >
                  No recent activity
                </div>
              ) : (
                transactions.map((tx, i) => (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem 1.5rem",
                      transition: "background-color 0.2s",
                      cursor: "pointer",
                    }}
                    className="hover-lift"
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor:
                            tx.type === "credit" ? "#E0F2FE" : "#FEE2E2",
                          color: tx.type === "credit" ? "#0369A1" : "#B91C1C",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: "1rem",
                        }}
                      >
                        {tx.type === "credit" ? "↙" : "↗"}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                          {tx.type === "credit"
                            ? `Transfer from ${tx.from_account}`
                            : `Transfer to ${tx.to_account}`}
                        </p>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--ink-soft)",
                          }}
                        >
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        fontWeight: 600,
                        color:
                          tx.type === "credit" ? "var(--teal)" : "var(--ink)",
                        fontSize: "0.875rem",
                      }}
                    >
                      {tx.type === "credit" ? "+" : "-"}${tx.amount_display}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                padding: "1rem 1.5rem",
                textAlign: "center",
                borderTop: "1px solid #F3F4F6",
              }}
            >
              <Link
                to="/history"
                style={{ fontSize: "0.875rem", color: "var(--ink-soft)" }}
              >
                View all operations
              </Link>
            </div>
          </div>
        </div>
      </div>
      {showFreezeModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div className="card" style={{
            maxWidth: "400px",
            width: "90%",
            padding: "2rem",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
            <h3 style={{ marginBottom: "1rem", color: "var(--danger)" }}>Freeze Account</h3>
            <p style={{ color: "var(--ink-soft)", marginBottom: "2rem", fontSize: "0.875rem" }}>
              Are you sure you want to freeze your account? You will be logged out and cannot log back in until you contact support.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowFreezeModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={executeFreeze}
                style={{ flex: 1, backgroundColor: "var(--danger)", borderColor: "var(--danger)" }}
              >
                Confirm Freeze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
