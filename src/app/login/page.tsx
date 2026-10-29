"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { api, getAuthToken, removeAuthToken, setAuthToken } from "@/lib/api";
import { errorMessage } from "@/lib/format";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in as admin? Go straight to the panel.
  useEffect(() => {
    if (!getAuthToken()) return;
    api
      .me()
      .then((res) => {
        if (res.data?.user?.role === "admin") window.location.replace("/");
      })
      .catch(() => removeAuthToken());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.login(email.trim(), password);
      const { user, token } = res.data;
      setAuthToken(token);

      if (user?.role !== "admin") {
        // Revoke the token we just received; this panel is admin-only.
        await api.logout().catch(() => {});
        removeAuthToken();
        setError("This account does not have administrator access.");
        return;
      }

      window.location.replace("/");
    } catch (err) {
      setError(errorMessage(err, "Sign in failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <BrandLogo href="/login" />
          <span className="admin-header-badge">Admin Panel</span>
        </div>

        <h1>Administrator sign in</h1>
        <p className="admin-login-intro">Manage students, tutors, courses, exams and results.</p>

        {error && (
          <div className="admin-error-msg" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="admin-form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="admin-form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="admin-btn-primary admin-btn-block" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
