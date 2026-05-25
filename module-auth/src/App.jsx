import React, { useState } from "react";
import "./styles.css";

// ─── Auth Module ──────────────────────────────────────────────────────────────
// This component is exposed via Module Federation as "auth/AuthApp"
// It can run standalone on port 3001 OR be loaded by the Shell at runtime.
// ─────────────────────────────────────────────────────────────────────────────

function LoginForm({ onSwitch }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setMessage("✓ Login successful! Redirecting...");
    }, 1200);
  };

  return (
    <div className="auth-card">
      <div className="auth-badge">AUTH MODULE · PORT 3001</div>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-sub">Sign in to continue to your workspace</p>

      {message && <div className="auth-success">{message}</div>}

      <form onSubmit={submit} className="auth-form">
        <div className="field-group">
          <label>Email address</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handle}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handle}
            placeholder="••••••••"
            required
          />
        </div>
        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? <span className="spinner" /> : "Sign in"}
        </button>
      </form>

      <p className="auth-switch">
        Don't have an account?{" "}
        <button onClick={onSwitch} className="link-btn">Create one</button>
      </p>
    </div>
  );
}

function RegisterForm({ onSwitch }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setMessage("✓ Account created! Welcome aboard.");
    }, 1200);
  };

  return (
    <div className="auth-card">
      <div className="auth-badge">AUTH MODULE · PORT 3001</div>
      <h1 className="auth-title">Create account</h1>
      <p className="auth-sub">Start your journey today</p>

      {message && <div className="auth-success">{message}</div>}

      <form onSubmit={submit} className="auth-form">
        <div className="field-group">
          <label>Full name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handle}
            placeholder="Jane Doe"
            required
          />
        </div>
        <div className="field-group">
          <label>Email address</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handle}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handle}
            placeholder="Min. 8 characters"
            required
          />
        </div>
        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? <span className="spinner" /> : "Create account"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{" "}
        <button onClick={onSwitch} className="link-btn">Sign in</button>
      </p>
    </div>
  );
}

export default function AuthApp() {
  const [view, setView] = useState("login");

  return (
    <div className="auth-root">
      <div className="auth-bg" />
      {view === "login"
        ? <LoginForm onSwitch={() => setView("register")} />
        : <RegisterForm onSwitch={() => setView("login")} />
      }
    </div>
  );
}
