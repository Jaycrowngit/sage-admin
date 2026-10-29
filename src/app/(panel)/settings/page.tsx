"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { imageFileToAvatar } from "@/lib/avatar";
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

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;

    setPhotoSuccess(null);
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const avatar = await imageFileToAvatar(file);
      const res = await api.uploadAvatar(avatar);
      setAdmin({ ...admin, ...res.data });
      setPhotoSuccess("Profile picture updated.");
    } catch (err) {
      setPhotoError(errorMessage(err, "Failed to upload profile picture."));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handlePhotoRemove() {
    if (!confirm("Remove your profile picture?")) return;

    setPhotoSuccess(null);
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const res = await api.removeAvatar();
      setAdmin({ ...admin, ...res.data, avatar_url: null });
      setPhotoSuccess("Profile picture removed.");
    } catch (err) {
      setPhotoError(errorMessage(err, "Failed to remove profile picture."));
    } finally {
      setPhotoBusy(false);
    }
  }

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
            <h2>Profile Picture</h2>
          </div>
          <div className="admin-settings-card-body">
            {photoSuccess && <div className="admin-success-msg">{photoSuccess}</div>}
            {photoError && <div className="admin-error-msg">{photoError}</div>}

            <div className="admin-photo-row">
              <Avatar name={admin.name} src={admin.avatar_url} className="admin-avatar admin-avatar-xl" />
              <div className="admin-photo-actions">
                <label className="admin-btn-primary" aria-disabled={photoBusy}>
                  {photoBusy ? "Uploading…" : admin.avatar_url ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="admin-visually-hidden"
                    onChange={handlePhotoChange}
                    disabled={photoBusy}
                  />
                </label>
                {admin.avatar_url && (
                  <button type="button" className="admin-btn-secondary" onClick={handlePhotoRemove} disabled={photoBusy}>
                    Remove
                  </button>
                )}
                <p className="admin-form-hint">JPG, PNG or WebP. The image is cropped to a square.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
