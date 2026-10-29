"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api, API_BASE_URL } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { errorMessage } from "@/lib/format";

export default function SettingsPage() {
  const { admin, setAdmin } = useAdmin();

  const [name, setName] = useState(admin.name);
  const [phone, setPhone] = useState(admin.phone ?? "");
  const [bio, setBio] = useState(admin.bio ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!name.trim()) return setErrorMsg("Name cannot be empty.");
    if (password && password.length < 8) return setErrorMsg("Password must be at least 8 characters.");
    if (password && password !== confirmPassword) return setErrorMsg("Passwords do not match.");

    setSaving(true);
    try {
      const payload: { name: string; phone: string; bio: string; password?: string } = {
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      };
      if (password) payload.password = password;

      const res = await api.updateProfile(payload);
      setAdmin({ ...admin, ...res.data });
      setPassword("");
      setConfirmPassword("");
      setSuccessMsg("Profile updated successfully.");
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your administrator profile and password" />

      <div className="admin-settings-grid">
        <div className="admin-settings-card">
          <div className="admin-settings-card-header">
            <h2>Admin Profile</h2>
          </div>

          <div className="admin-settings-card-body">
            {successMsg && <div className="admin-success-msg">{successMsg}</div>}
            {errorMsg && <div className="admin-error-msg">{errorMsg}</div>}

            <form onSubmit={handleSave}>
              <div className="admin-form-group">
                <label htmlFor="s-name">Full Name</label>
                <input id="s-name" className="admin-form-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="admin-form-group">
                <label htmlFor="s-email">Email Address</label>
                <input id="s-email" className="admin-form-input" type="email" value={admin.email} disabled />
                <p className="admin-form-hint">Your sign-in email can be changed by another administrator.</p>
              </div>

              <div className="admin-form-group">
                <label htmlFor="s-phone">Phone Number</label>
                <input
                  id="s-phone"
                  className="admin-form-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +234 800 000 0000"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="s-bio">Bio</label>
                <textarea id="s-bio" className="admin-form-textarea" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>

              <hr className="admin-form-divider" />

              <div className="admin-form-group">
                <label htmlFor="s-password">New Password</label>
                <input
                  id="s-password"
                  className="admin-form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  autoComplete="new-password"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="s-password2">Confirm New Password</label>
                <input
                  id="s-password2"
                  className="admin-form-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="admin-btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>

        <div className="admin-settings-card">
          <div className="admin-settings-card-header">
            <h2>Connection</h2>
          </div>
          <div className="admin-settings-card-body">
            <div className="admin-data-row">
              <span className="admin-data-row-label">API endpoint</span>
              <span className="admin-data-row-value mono">{API_BASE_URL}</span>
            </div>
            <p className="admin-form-hint">
              This panel uses the same backend as the student site. Set <code>NEXT_PUBLIC_API_URL</code> in{" "}
              <code>.env.local</code> to point it elsewhere.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
