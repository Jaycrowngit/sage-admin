"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { errorMessage, formatDate, formatPercent } from "@/lib/format";
import { PageHeader } from "./PageHeader";
import { UserFormModal } from "./UserFormModal";
import { useQuery } from "./useQuery";

type UserDetailViewProps = {
  userId: string;
  back: { href: string; label: string };
};

export function UserDetailView({ userId, back }: UserDetailViewProps) {
  const router = useRouter();
  const { admin } = useAdmin();
  const fetchUser = useCallback(() => api.user(userId), [userId]);
  const { data: user, loading, error, reload } = useQuery(fetchUser, "Failed to load user.");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!user) return;
    const extra = user.role === "student" ? " All of their exam attempts and results will also be removed." : "";
    if (!confirm(`Delete ${user.name}'s account?${extra} This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteUser(user.id);
      router.push(back.href);
    } catch (err) {
      alert(errorMessage(err, "Failed to delete user."));
      setDeleting(false);
    }
  }

  if (loading && !user) return <div className="admin-loading">Loading profile…</div>;
  if (error && !user) {
    return (
      <>
        <PageHeader title="Profile" back={back} />
        <div className="admin-error-msg">{error}</div>
      </>
    );
  }
  if (!user) return null;

  const isSelf = String(user.id) === String(admin.id);
  const stats = user.stats;

  return (
    <div>
      <PageHeader
        title={user.name}
        subtitle={
          <>
            <span className={`admin-role-badge ${user.role}`}>{user.role}</span> · Joined {formatDate(user.created_at)}
          </>
        }
        back={back}
        actions={
          <>
            <button className="admin-btn-secondary" onClick={() => setEditing(true)}>
              Edit
            </button>
            {!isSelf && (
              <button className="admin-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </>
        }
      />

      <div className="admin-detail-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h3>Contact</h3>
          </div>
          <div className="admin-data-row">
            <span className="admin-data-row-label">Email</span>
            <span className="admin-data-row-value">{user.email}</span>
          </div>
          <div className="admin-data-row">
            <span className="admin-data-row-label">Phone</span>
            <span className="admin-data-row-value">{user.phone || "—"}</span>
          </div>
          {user.role === "student" && (
            <div className="admin-data-row">
              <span className="admin-data-row-label">Courses</span>
              <span className="admin-data-row-value admin-chip-list">
                {user.courses && user.courses.length > 0
                  ? user.courses.map((c) => (
                      <span key={String(c.id)} className="admin-code-badge">
                        {c.code || c.name}
                      </span>
                    ))
                  : "—"}
              </span>
            </div>
          )}
          {user.bio && <p className="admin-bio">{user.bio}</p>}
        </div>

        {stats && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h3>Performance</h3>
            </div>
            <div className="admin-mini-stats">
              <div>
                <strong>{stats.total_attempts}</strong>
                <span>Exams taken</span>
              </div>
              <div>
                <strong className="text-pass">{stats.passed_attempts}</strong>
                <span>Passed</span>
              </div>
              <div>
                <strong className="text-fail">{stats.failed_attempts}</strong>
                <span>Failed</span>
              </div>
              <div>
                <strong>{formatPercent(stats.average_percentage)}</strong>
                <span>Average</span>
              </div>
              <div>
                <strong>{formatPercent(stats.best_percentage)}</strong>
                <span>Best</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {user.recent_attempts && (
        <>
          <h2 className="admin-section-title">Exam History</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Course</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {user.recent_attempts.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="admin-empty">No exams taken yet.</div>
                    </td>
                  </tr>
                ) : (
                  user.recent_attempts.map((a) => (
                    <tr key={String(a.id)}>
                      <td className="cell-strong">{a.exam?.title ?? "Deleted exam"}</td>
                      <td>{a.exam?.course?.name ?? "—"}</td>
                      <td>
                        {a.exam && <span className={`admin-type-badge ${a.exam.type}`}>{a.exam.type}</span>}
                      </td>
                      <td>
                        {a.score} / {a.total_possible}
                      </td>
                      <td>{formatPercent(a.percentage)}</td>
                      <td>
                        <span className={`admin-pass-badge ${a.passed ? "pass" : "fail"}`}>
                          {a.passed ? "Passed" : "Failed"}
                        </span>
                      </td>
                      <td className="cell-muted">{formatDate(a.submitted_at, true)}</td>
                      <td>
                        <Link href={`/results/${a.id}`} className="admin-btn-secondary">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {user.created_exams && (
        <>
          <h2 className="admin-section-title">Exams Created</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Course</th>
                  <th>Type</th>
                  <th>Questions</th>
                  <th>Published</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {user.created_exams.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="admin-empty">No exams created yet.</div>
                    </td>
                  </tr>
                ) : (
                  user.created_exams.map((exam) => (
                    <tr key={String(exam.id)}>
                      <td className="cell-strong">{exam.title}</td>
                      <td>{exam.course?.name ?? "—"}</td>
                      <td>
                        <span className={`admin-type-badge ${exam.type}`}>{exam.type}</span>
                      </td>
                      <td>{exam.questions_count ?? 0}</td>
                      <td>
                        <span className={`admin-published-badge ${exam.is_published ? "yes" : "no"}`}>
                          {exam.is_published ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <Link href={`/exams/${exam.id}/questions`} className="admin-btn-secondary">
                          Questions
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <UserFormModal
          user={user}
          defaultRole={user.role}
          allowedRoles={isSelf ? ["admin"] : ["student", "tutor", "admin"]}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
