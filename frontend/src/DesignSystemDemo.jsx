import React from "react";
import Logo from "./components/Logo";
import "./index.css";

export default function DesignSystemDemo() {
  const colors = [
    { name: "--ink", value: "var(--ink)", text: "#FFF" },
    { name: "--ink-soft", value: "var(--ink-soft)", text: "#FFF" },
    { name: "--paper", value: "var(--paper)", text: "var(--ink)" },
    {
      name: "--paper-raised",
      value: "var(--paper-raised)",
      text: "var(--ink)",
    },
    { name: "--sand", value: "var(--sand)", text: "var(--ink)" },
    { name: "--orange", value: "var(--orange)", text: "#FFF" },
    { name: "--orange-deep", value: "var(--orange-deep)", text: "#FFF" },
    {
      name: "--orange-tint",
      value: "var(--orange-tint)",
      text: "var(--orange-deep)",
    },
    { name: "--gold", value: "var(--gold)", text: "#FFF" },
    { name: "--gold-soft", value: "var(--gold-soft)", text: "var(--ink)" },
    { name: "--gold-line", value: "var(--gold-line)", text: "var(--ink)" },
    { name: "--success", value: "var(--success)", text: "#FFF" },
    {
      name: "--success-tint",
      value: "var(--success-tint)",
      text: "var(--success)",
    },
    { name: "--danger", value: "var(--danger)", text: "#FFF" },
    {
      name: "--danger-tint",
      value: "var(--danger-tint)",
      text: "var(--danger)",
    },
  ];

  return (
    <div className="demo-container">
      <h2 style={{ marginBottom: "2rem" }}>Solstice Bank Design System</h2>

      <section style={{ marginBottom: "3rem" }}>
        <h3
          style={{
            borderBottom: "1px solid var(--gold-line)",
            paddingBottom: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          1. Logo & Brand
        </h3>
        <div
          style={{
            padding: "2rem",
            backgroundColor: "var(--ink)",
            borderRadius: "14px",
            display: "inline-block",
          }}
        >
          <Logo size={48} />
        </div>
        <div
          style={{
            padding: "2rem",
            backgroundColor: "var(--paper)",
            display: "inline-block",
            marginLeft: "1rem",
          }}
        >
          <Logo size={48} />
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h3
          style={{
            borderBottom: "1px solid var(--gold-line)",
            paddingBottom: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          2. Color Palette
        </h3>
        <div className="swatch-grid">
          {colors.map((c) => (
            <div
              key={c.name}
              className="swatch"
              style={{ backgroundColor: c.value, color: c.text }}
            >
              {c.name}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h3
          style={{
            borderBottom: "1px solid var(--gold-line)",
            paddingBottom: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          3. Typography
        </h3>
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              Display: Fraunces
            </span>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "3rem",
                margin: 0,
              }}
            >
              LKR12,450<span style={{ fontSize: "1.5rem" }}>.00</span>
            </h1>
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              Headings: Manrope (800)
            </span>
            <h2>Dashboard Overview</h2>
            <h3>Recent Activity</h3>
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              Body/UI: Manrope (500/700)
            </span>
            <p style={{ maxWidth: "600px" }}>
              This is body text. The interface relies heavily on Manrope for{" "}
              <span style={{ fontWeight: 700 }}>bold labels</span> and
              structural UI elements. It remains highly legible at small sizes.
            </p>
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              Mono: IBM Plex Mono
            </span>
            <p style={{ fontFamily: "var(--font-mono)" }}>
              SB1234567890
              <br />
              2024-05-12 14:32:00
              <br />
              +LKR500.00
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h3
          style={{
            borderBottom: "1px solid var(--gold-line)",
            paddingBottom: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          4. Buttons
        </h3>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button className="btn btn-primary">Primary Action</button>
          <button className="btn btn-secondary">Secondary Action</button>
          <button className="btn btn-ghost">Ghost Button</button>
          <button className="btn btn-dark">Dark Action</button>
          <button className="btn btn-primary" disabled>
            Disabled
          </button>
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h3
          style={{
            borderBottom: "1px solid var(--gold-line)",
            paddingBottom: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          5. Auth Layout Preview (Centered Card)
        </h3>
        <div
          className="auth-layout"
          style={{
            minHeight: "400px",
            borderRadius: "14px",
            margin: "0 -1rem",
          }}
        >
          <div className="auth-card">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "2rem",
              }}
            >
              <Logo size={40} />
            </div>
            <h3 style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              Sign in
            </h3>
            <button className="btn btn-primary" style={{ width: "100%" }}>
              Continue →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
