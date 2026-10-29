"use client";

import { useEffect, useState } from "react";
import { api, type UserPayload } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Course, Role, User } from "@/lib/types";
import { Modal } from "./Modal";

type UserFormModalProps = {
  user?: User | null;
  defaultRole: Role;
  allowedRoles: Role[];
  onClose: () => void;
  onSaved: (user: User) => void;
};

const ROLE_LABELS: Record<Role, string> = { student: "Student", tutor: "Tutor", admin: "Administrator" };

export function UserFormModal({ user, defaultRole, allowedRoles, onClose, onSaved }: UserFormModalProps) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? defaultRole);
  const [password, setPassword] = useState("");
  const [courseIds, setCourseIds] = useState<string[]>(user?.courses?.map((c) => String(c.id)) ?? []);
  const [courses, setCourses] = useState<Course[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .courses()
      .then((res) => setCourses(res.data ?? []))
      .catch(() => setCourses([]));
  }, []);

  function toggleCourse(id: string) {
    setCourseIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!isEdit && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (isEdit && password && password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    const payload: UserPayload = {
      name: name.trim(),
      email: email.trim(),
      role,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
    };
    if (password) payload.password = password;
    if (role === "student") payload.course_ids = courseIds;

    setSaving(true);
    try {
      const res = isEdit ? await api.updateUser(user!.id, payload) : await api.createUser(payload);
      onSaved(res.data);
    } catch (err) {
      setError(errorMessage(err, "Failed to save account."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? `Edit ${ROLE_LABELS[user!.role]}` : `Add ${ROLE_LABELS[defaultRole]}`}
      onClose={onClose}
      footer={
        <>
          <button className="admin-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="admin-btn-primary" onClick={() => handleSubmit()} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Account"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="admin-error-msg">{error}</div>}

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="uf-name">Full Name *</label>
            <input id="uf-name" className="admin-form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="uf-email">Email *</label>
            <input
              id="uf-email"
              type="email"
              className="admin-form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="uf-phone">Phone</label>
            <input id="uf-phone" className="admin-form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="uf-role">Role</label>
            <select
              id="uf-role"
              className="admin-form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              disabled={allowedRoles.length < 2}
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="uf-password">{isEdit ? "New Password" : "Password *"}</label>
          <input
            id="uf-password"
            type="password"
            className="admin-form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? "Leave blank to keep current password" : "At least 8 characters"}
            autoComplete="new-password"
          />
        </div>

        {role === "student" && (
          <div className="admin-form-group">
            <span className="admin-section-label">Enrolled Courses</span>
            {courses.length === 0 ? (
              <p className="admin-form-hint">No courses available.</p>
            ) : (
              <div className="admin-chip-select">
                {courses.map((c) => {
                  const id = String(c.id);
                  const active = courseIds.includes(id);
                  return (
                    <button
                      type="button"
                      key={id}
                      className={`admin-chip${active ? " active" : ""}`}
                      onClick={() => toggleCourse(id)}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="admin-form-group">
          <label htmlFor="uf-bio">Bio</label>
          <textarea id="uf-bio" className="admin-form-textarea" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
