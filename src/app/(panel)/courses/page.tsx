"use client";

import { useCallback, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@/components/useQuery";
import { api, type CoursePayload } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Course } from "@/lib/types";

type CourseForm = {
  name: string;
  code: string;
  category: string;
  description: string;
  is_active: boolean;
};

const EMPTY_FORM: CourseForm = { name: "", code: "", category: "", description: "", is_active: true };

export default function CoursesPage() {
  const fetchCourses = useCallback(() => api.courses(), []);
  const { data, loading, error, reload, setData } = useQuery(fetchCourses, "Failed to load courses");
  const courses = useMemo(() => data ?? [], [data]);

  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
    );
  }, [courses, search]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditTarget(null);
    setModalMode("add");
  }

  function openEdit(course: Course) {
    setForm({
      name: course.name ?? "",
      code: course.code ?? "",
      category: course.category ?? "",
      description: course.description ?? "",
      is_active: course.is_active !== false,
    });
    setFormError(null);
    setEditTarget(course);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(null);
    setFormError(null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Course name and code are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload: CoursePayload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    try {
      if (modalMode === "add") {
        await api.createCourse(payload);
      } else if (editTarget) {
        // Only send the code when it changed, so the unique check never trips on itself
        const { code, ...rest } = payload;
        await api.updateCourse(editTarget.id, code !== editTarget.code ? payload : rest);
      }
      closeModal();
      reload();
    } catch (err) {
      setFormError(errorMessage(err, "Failed to save course."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(course: Course) {
    setBusyId(course.id);
    try {
      const res = await api.updateCourse(course.id, { is_active: course.is_active === false });
      setData((prev) => (prev ?? []).map((c) => (c.id === course.id ? { ...c, ...res.data } : c)));
    } catch (err) {
      alert(errorMessage(err, "Failed to update course."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(course: Course) {
    if (!confirm(`Delete "${course.name}"? Students enrolled in it will be unenrolled.`)) return;
    setBusyId(course.id);
    try {
      await api.deleteCourse(course.id);
      setData((prev) => (prev ?? []).filter((c) => c.id !== course.id));
    } catch (err) {
      alert(errorMessage(err, "Failed to delete course."));
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = courses.filter((c) => c.is_active !== false).length;

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle={`${courses.length} course${courses.length !== 1 ? "s" : ""} · ${activeCount} active`}
        actions={
          <button className="admin-btn-primary" onClick={openAdd}>
            + Add Course
          </button>
        }
      />

      {error && <div className="admin-error-msg">{error}</div>}

      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-search-input"
          placeholder="Search by name, code or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && courses.length === 0 ? (
        <div className="admin-loading">Loading courses…</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Category</th>
                <th>Description</th>
                <th>Published Exams</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty">
                      {courses.length === 0 ? "No courses yet. Add your first course." : "No courses match your search."}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={String(c.id)}>
                    <td className="cell-strong">{c.name}</td>
                    <td>{c.code ? <span className="admin-code-badge">{c.code}</span> : "—"}</td>
                    <td>{c.category || "—"}</td>
                    <td className="cell-truncate" title={c.description ?? ""}>
                      {c.description || "—"}
                    </td>
                    <td>{c.exams_count ?? 0}</td>
                    <td>
                      <button
                        className={`admin-status-toggle ${c.is_active !== false ? "on" : "off"}`}
                        onClick={() => toggleActive(c)}
                        disabled={busyId === c.id}
                        title="Click to toggle"
                      >
                        {c.is_active !== false ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button className="admin-btn-secondary" onClick={() => openEdit(c)}>
                          Edit
                        </button>
                        <button className="admin-btn-danger" onClick={() => handleDelete(c)} disabled={busyId === c.id}>
                          {busyId === c.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalMode && (
        <Modal
          title={modalMode === "add" ? "Add Course" : "Edit Course"}
          onClose={closeModal}
          footer={
            <>
              <button className="admin-btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modalMode === "add" ? "Create Course" : "Save Changes"}
              </button>
            </>
          }
        >
          {formError && <div className="admin-error-msg">{formError}</div>}

          <div className="admin-form-group">
            <label htmlFor="course-name">Course Name *</label>
            <input
              id="course-name"
              className="admin-form-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. English Language"
            />
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="course-code">Code *</label>
              <input
                id="course-code"
                className="admin-form-input"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. ENG101"
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="course-category">Category</label>
              <input
                id="course-category"
                className="admin-form-input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Arts & Humanities"
              />
            </div>
          </div>
          <div className="admin-form-group">
            <label htmlFor="course-description">Description</label>
            <textarea
              id="course-description"
              className="admin-form-textarea"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short course description…"
            />
          </div>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active (students can see and enrol in this course)
          </label>
        </Modal>
      )}
    </div>
  );
}
