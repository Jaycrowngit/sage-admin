"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { UserFormModal } from "@/components/UserFormModal";
import { useDebounced } from "@/components/useDebounced";
import { useQuery } from "@/components/useQuery";
import { api } from "@/lib/api";
import { errorMessage, formatDate, formatPercent } from "@/lib/format";
import type { Course, User } from "@/lib/types";

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const debouncedSearch = useDebounced(search);

  const [courses, setCourses] = useState<Course[]>([]);
  const [modal, setModal] = useState<{ user: User | null } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStudents = useCallback(
    () => api.students({ page, per_page: 20, search: debouncedSearch.trim(), course_id: courseId }),
    [page, debouncedSearch, courseId]
  );
  const { data: result, loading, error, reload } = useQuery(fetchStudents, "Failed to load students");

  useEffect(() => {
    api
      .courses()
      .then((res) => setCourses(res.data ?? []))
      .catch(() => {});
  }, []);

  async function handleDelete(student: User) {
    if (!confirm(`Delete ${student.name}? All of their exam attempts and results will also be removed.`)) return;
    setDeletingId(student.id);
    try {
      await api.deleteUser(student.id);
      reload();
    } catch (err) {
      alert(errorMessage(err, "Failed to delete student."));
    } finally {
      setDeletingId(null);
    }
  }

  const students = result?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${result?.total ?? 0} registered student${result?.total === 1 ? "" : "s"}`}
        actions={
          <button className="admin-btn-primary" onClick={() => setModal({ user: null })}>
            + Add Student
          </button>
        }
      />

      {error && <div className="admin-error-msg">{error}</div>}

      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-search-input"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="admin-filter-select"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
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

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Courses</th>
              <th>Exams</th>
              <th>Pass Rate</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && students.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-loading">Loading students…</div>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-empty">No students found.</div>
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const attempts = s.total_attempts ?? 0;
                const passRate = attempts > 0 ? ((s.passed_attempts ?? 0) / attempts) * 100 : null;
                return (
                  <tr key={String(s.id)} className={loading ? "is-stale" : ""}>
                    <td className="cell-strong">
                      <Link href={`/students/${s.id}`} className="admin-link">
                        {s.name}
                      </Link>
                    </td>
                    <td>{s.email}</td>
                    <td>{s.phone || "—"}</td>
                    <td>
                      <div className="admin-chip-list">
                        {s.courses && s.courses.length > 0
                          ? s.courses.map((c) => (
                              <span key={String(c.id)} className="admin-code-badge" title={c.name}>
                                {c.code || c.name}
                              </span>
                            ))
                          : "—"}
                      </div>
                    </td>
                    <td>{attempts}</td>
                    <td>{passRate === null ? "—" : formatPercent(passRate)}</td>
                    <td className="cell-muted">{formatDate(s.created_at)}</td>
                    <td>
                      <div className="admin-table-actions">
                        <Link href={`/students/${s.id}`} className="admin-btn-secondary">
                          View
                        </Link>
                        <button className="admin-btn-secondary" onClick={() => setModal({ user: s })}>
                          Edit
                        </button>
                        <button
                          className="admin-btn-danger"
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s.id}
                        >
                          {deletingId === s.id ? "…" : "Delete"}
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

      {modal && (
        <UserFormModal
          user={modal.user}
          defaultRole="student"
          allowedRoles={modal.user ? ["student", "tutor", "admin"] : ["student"]}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
