"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { useQuery } from "@/components/useQuery";
import { api, type ExamPayload } from "@/lib/api";
import { errorMessage, formatDate, fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import type { Course, Exam, ExamType } from "@/lib/types";

type ExamForm = {
  title: string;
  description: string;
  type: ExamType;
  course_id: string;
  duration_minutes: string;
  total_marks: string;
  pass_percentage: string;
  is_published: boolean;
  shuffle_questions: boolean;
  scheduled_start_at: string;
  scheduled_end_at: string;
};

const EMPTY_FORM: ExamForm = {
  title: "",
  description: "",
  type: "practice",
  course_id: "",
  duration_minutes: "30",
  total_marks: "100",
  pass_percentage: "50",
  is_published: false,
  shuffle_questions: false,
  scheduled_start_at: "",
  scheduled_end_at: "",
};

function liveStatus(exam: Exam): { label: string; tone: string } | null {
  if (exam.type !== "live") return null;
  const now = Date.now();
  const start = exam.scheduled_start_at ? new Date(exam.scheduled_start_at).getTime() : null;
  const end = exam.scheduled_end_at ? new Date(exam.scheduled_end_at).getTime() : null;
  if (start && now < start) return { label: "Upcoming", tone: "upcoming" };
  if (end && now > end) return { label: "Ended", tone: "ended" };
  return { label: "Ongoing", tone: "ongoing" };
}

export default function ExamsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);

  const fetchExams = useCallback(
    () => api.exams({ page, per_page: 20, type: typeFilter, course_id: courseFilter }),
    [page, typeFilter, courseFilter]
  );
  const { data: result, loading, error, reload, setData } = useQuery(fetchExams, "Failed to load exams");

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Exam | null>(null);
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api
      .courses()
      .then((res) => setCourses(res.data ?? []))
      .catch(() => {});
  }, []);

  function openAdd() {
    setForm({ ...EMPTY_FORM, course_id: courses[0] ? String(courses[0].id) : "" });
    setFormError(null);
    setEditTarget(null);
    setModalMode("add");
  }

  function openEdit(exam: Exam) {
    setForm({
      title: exam.title ?? "",
      description: exam.description ?? "",
      type: exam.type ?? "practice",
      course_id: String(exam.course_id ?? exam.course?.id ?? ""),
      duration_minutes: String(exam.duration_minutes ?? 30),
      total_marks: String(exam.total_marks ?? 100),
      pass_percentage: String(exam.pass_percentage ?? 50),
      is_published: !!exam.is_published,
      shuffle_questions: !!exam.shuffle_questions,
      scheduled_start_at: toDateTimeLocal(exam.scheduled_start_at),
      scheduled_end_at: toDateTimeLocal(exam.scheduled_end_at),
    });
    setFormError(null);
    setEditTarget(exam);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(null);
    setFormError(null);
  }

  function update<K extends keyof ExamForm>(key: K, value: ExamForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const duration = Number(form.duration_minutes);
    const pass = Number(form.pass_percentage);
    const marks = Number(form.total_marks);

    if (!form.title.trim()) return setFormError("Exam title is required.");
    if (!form.course_id) return setFormError("Select the course this exam belongs to.");
    if (!Number.isInteger(duration) || duration < 1 || duration > 300)
      return setFormError("Duration must be between 1 and 300 minutes.");
    if (!Number.isInteger(pass) || pass < 1 || pass > 100) return setFormError("Pass percentage must be between 1 and 100.");
    if (!Number.isInteger(marks) || marks < 1) return setFormError("Total marks must be a whole number of at least 1.");

    const start = fromDateTimeLocal(form.scheduled_start_at);
    const end = fromDateTimeLocal(form.scheduled_end_at);
    if (form.type === "live") {
      if (!start || !end) return setFormError("Live exams need a start and end time.");
      if (new Date(end) <= new Date(start)) return setFormError("The end time must be after the start time.");
    }

    const payload: ExamPayload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      course_id: form.course_id,
      type: form.type,
      duration_minutes: duration,
      total_marks: marks,
      pass_percentage: pass,
      is_published: form.is_published,
      shuffle_questions: form.shuffle_questions,
      scheduled_start_at: form.type === "live" ? start : null,
      scheduled_end_at: form.type === "live" ? end : null,
    };

    setSaving(true);
    setFormError(null);
    try {
      if (modalMode === "add") {
        await api.createExam(payload);
      } else if (editTarget) {
        await api.updateExam(editTarget.id, payload);
      }
      closeModal();
      reload();
    } catch (err) {
      setFormError(errorMessage(err, "Failed to save exam."));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(exam: Exam) {
    if (!exam.is_published && (exam.questions_count ?? 0) === 0) {
      if (!confirm("This exam has no questions yet. Publish it anyway?")) return;
    }
    setBusyId(exam.id);
    try {
      await api.updateExam(exam.id, { is_published: !exam.is_published });
      setData((prev) =>
        prev ? { ...prev, data: prev.data.map((e) => (e.id === exam.id ? { ...e, is_published: !exam.is_published } : e)) } : prev
      );
    } catch (err) {
      alert(errorMessage(err, "Failed to update exam."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(exam: Exam) {
    if (!confirm(`Delete "${exam.title}"? All its questions and every student result for it will be removed.`)) return;
    setBusyId(exam.id);
    try {
      await api.deleteExam(exam.id);
      reload();
    } catch (err) {
      alert(errorMessage(err, "Failed to delete exam."));
    } finally {
      setBusyId(null);
    }
  }

  const exams = result?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Exams"
        subtitle={`${result?.total ?? 0} exam${result?.total === 1 ? "" : "s"} — practice tests and scheduled live exams`}
        actions={
          <button className="admin-btn-primary" onClick={openAdd}>
            + Create Exam
          </button>
        }
      />

      {error && <div className="admin-error-msg">{error}</div>}

      <div className="admin-toolbar">
        <div className="admin-toolbar-group">
          <select
            className="admin-filter-select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="practice">Practice</option>
            <option value="live">Live</option>
          </select>
          <select
            className="admin-filter-select"
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Course</th>
              <th>Duration</th>
              <th>Pass</th>
              <th>Questions</th>
              <th>Published</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && exams.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-loading">Loading exams…</div>
                </td>
              </tr>
            ) : exams.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-empty">No exams found. Create your first exam.</div>
                </td>
              </tr>
            ) : (
              exams.map((exam) => {
                const status = liveStatus(exam);
                return (
                  <tr key={String(exam.id)} className={loading ? "is-stale" : ""}>
                    <td>
                      <span className="cell-strong">{exam.title}</span>
                      {exam.creator && <span className="admin-data-row-sub">by {exam.creator.name}</span>}
                    </td>
                    <td>
                      <span className={`admin-type-badge ${exam.type}`}>{exam.type}</span>
                      {status && (
                        <span className={`admin-live-status ${status.tone}`} title={`${formatDate(exam.scheduled_start_at, true)} → ${formatDate(exam.scheduled_end_at, true)}`}>
                          {status.label}
                        </span>
                      )}
                    </td>
                    <td>{exam.course?.name ?? "—"}</td>
                    <td>{exam.duration_minutes}m</td>
                    <td>{exam.pass_percentage ?? 50}%</td>
                    <td>{exam.questions_count ?? 0}</td>
                    <td>
                      <button
                        className={`admin-status-toggle ${exam.is_published ? "on" : "off"}`}
                        onClick={() => togglePublish(exam)}
                        disabled={busyId === exam.id}
                        title="Click to toggle"
                      >
                        {exam.is_published ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <Link href={`/exams/${exam.id}/questions`} className="admin-btn-secondary">
                          Questions
                        </Link>
                        <Link href={`/exams/${exam.id}/submissions`} className="admin-btn-secondary">
                          Submissions
                        </Link>
                        <button className="admin-btn-secondary" onClick={() => openEdit(exam)}>
                          Edit
                        </button>
                        <button className="admin-btn-danger" onClick={() => handleDelete(exam)} disabled={busyId === exam.id}>
                          {busyId === exam.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {result && (
        <Pagination
          page={result.current_page}
          lastPage={result.last_page}
          total={result.total}
          from={result.from}
          to={result.to}
          onChange={setPage}
        />
      )}

      {modalMode && (
        <Modal
          title={modalMode === "add" ? "Create Exam" : "Edit Exam"}
          onClose={closeModal}
          wide
          footer={
            <>
              <button className="admin-btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modalMode === "add" ? "Create Exam" : "Save Changes"}
              </button>
            </>
          }
        >
          {formError && <div className="admin-error-msg">{formError}</div>}

          <div className="admin-form-group">
            <label htmlFor="exam-title">Title *</label>
            <input
              id="exam-title"
              className="admin-form-input"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. English Language – Mock Exam"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="exam-description">Description / Instructions</label>
            <textarea
              id="exam-description"
              className="admin-form-textarea"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Optional instructions shown to students…"
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="exam-type">Type</label>
              <select
                id="exam-type"
                className="admin-form-select"
                value={form.type}
                onChange={(e) => update("type", e.target.value as ExamType)}
              >
                <option value="practice">Practice (take anytime)</option>
                <option value="live">Live (scheduled, one attempt)</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label htmlFor="exam-course">Course *</label>
              <select
                id="exam-course"
                className="admin-form-select"
                value={form.course_id}
                onChange={(e) => update("course_id", e.target.value)}
              >
                <option value="">— Select course —</option>
                {courses.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                    {c.is_active === false ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.type === "live" && (
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label htmlFor="exam-start">Starts *</label>
                <input
                  id="exam-start"
                  type="datetime-local"
                  className="admin-form-input"
                  value={form.scheduled_start_at}
                  onChange={(e) => update("scheduled_start_at", e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="exam-end">Ends *</label>
                <input
                  id="exam-end"
                  type="datetime-local"
                  className="admin-form-input"
                  value={form.scheduled_end_at}
                  onChange={(e) => update("scheduled_end_at", e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="admin-form-row three">
            <div className="admin-form-group">
              <label htmlFor="exam-duration">Duration (min)</label>
              <input
                id="exam-duration"
                type="number"
                className="admin-form-input"
                value={form.duration_minutes}
                min={1}
                max={300}
                onChange={(e) => update("duration_minutes", e.target.value)}
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="exam-marks">Total Marks</label>
              <input
                id="exam-marks"
                type="number"
                className="admin-form-input"
                value={form.total_marks}
                min={1}
                onChange={(e) => update("total_marks", e.target.value)}
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="exam-pass">Pass Mark (%)</label>
              <input
                id="exam-pass"
                type="number"
                className="admin-form-input"
                value={form.pass_percentage}
                min={1}
                max={100}
                onChange={(e) => update("pass_percentage", e.target.value)}
              />
            </div>
          </div>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.shuffle_questions}
              onChange={(e) => update("shuffle_questions", e.target.checked)}
            />
            Shuffle question order for each student
          </label>
          <label className="admin-checkbox">
            <input type="checkbox" checked={form.is_published} onChange={(e) => update("is_published", e.target.checked)} />
            Published (visible to students)
          </label>
        </Modal>
      )}
    </div>
  );
}
