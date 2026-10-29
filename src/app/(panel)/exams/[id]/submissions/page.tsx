"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { useQuery } from "@/components/useQuery";
import { api } from "@/lib/api";
import { downloadCSV, errorMessage, formatDate, formatNumber, formatPercent } from "@/lib/format";

export default function SubmissionsPage() {
  const { id: examId } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const fetchSubmissions = useCallback(() => api.submissions(examId, page), [examId, page]);
  const { data, loading, error } = useQuery(fetchSubmissions, "Failed to load submissions");

  const exam = data?.exam;
  const stats = data?.stats;
  const submissions = data?.submissions;
  const rows = submissions?.data ?? [];
  const rankOffset = submissions ? (submissions.current_page - 1) * submissions.per_page : 0;

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.exportResults({ exam_id: examId });
      const records = res.data.records;
      if (records.length === 0) {
        alert("No submissions to export.");
        return;
      }
      downloadCSV(
        `sage-${(exam?.title ?? "exam").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.csv`,
        ["Student", "Email", "Phone", "Score", "Total", "Percentage", "Status", "Correct", "Incorrect", "Unanswered", "Submitted"],
        records.map((r) => [
          r.student_name,
          r.student_email,
          r.student_phone,
          r.score,
          r.total_possible,
          r.percentage,
          r.passed,
          r.correct_answers,
          r.incorrect_answers,
          r.unanswered,
          r.submitted_at,
        ])
      );
    } catch (err) {
      alert(errorMessage(err, "Export failed."));
    } finally {
      setExporting(false);
    }
  }

  const passRate = stats && stats.total_submissions > 0 ? (stats.pass_count / stats.total_submissions) * 100 : 0;

  return (
    <div>
      <PageHeader
        title={exam ? `${exam.title} — Submissions` : "Submissions"}
        subtitle={
          exam && (
            <>
              <span className={`admin-type-badge ${exam.type}`}>{exam.type}</span> {exam.course ?? ""} · Pass mark{" "}
              {exam.pass_percentage}%
            </>
          )
        }
        back={{ href: "/exams", label: "Back to Exams" }}
        actions={
          <>
            <Link href={`/exams/${examId}/questions`} className="admin-btn-secondary">
              Questions
            </Link>
            <button className="admin-btn-primary" onClick={handleExport} disabled={exporting || !stats?.total_submissions}>
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </>
        }
      />

      {error && <div className="admin-error-msg">{error}</div>}

      {stats && (
        <div className="admin-stats-grid compact">
          <div className="admin-stat-card">
            <div className="admin-stat-data">
              <span className="admin-stat-value">{stats.total_submissions}</span>
              <span className="admin-stat-label">Submissions</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-data">
              <span className="admin-stat-value">{formatPercent(stats.average_percentage)}</span>
              <span className="admin-stat-label">Average score</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-data">
              <span className="admin-stat-value">{formatNumber(stats.highest_score)}</span>
              <span className="admin-stat-label">Highest score</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-data">
              <span className="admin-stat-value">{formatPercent(passRate)}</span>
              <span className="admin-stat-label">
                Pass rate ({stats.pass_count} passed)
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Correct / Wrong / Skipped</th>
              <th>Status</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-loading">Loading submissions…</div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-empty">No submissions yet.</div>
                </td>
              </tr>
            ) : (
              rows.map((a, i) => (
                <tr key={String(a.id)} className={loading ? "is-stale" : ""}>
                  <td className="cell-muted">#{rankOffset + i + 1}</td>
                  <td>
                    {a.user ? (
                      <Link href={`/students/${a.user.id}`} className="admin-link cell-strong">
                        {a.user.name}
                      </Link>
                    ) : (
                      <span className="cell-muted">Deleted user</span>
                    )}
                    {a.user?.email && <span className="admin-data-row-sub">{a.user.email}</span>}
                  </td>
                  <td>
                    {formatNumber(a.score)} / {formatNumber(a.total_possible)}
                  </td>
                  <td>{formatPercent(a.percentage)}</td>
                  <td className="cell-muted">
                    {a.correct_answers_count ?? 0} / {a.incorrect_answers_count ?? 0} / {a.unanswered_count ?? 0}
                  </td>
                  <td>
                    <span className={`admin-pass-badge ${a.passed ? "pass" : "fail"}`}>{a.passed ? "Passed" : "Failed"}</span>
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

      {submissions && (
        <Pagination
          page={submissions.current_page}
          lastPage={submissions.last_page}
          total={submissions.total}
          from={submissions.from}
          to={submissions.to}
          onChange={setPage}
        />
      )}
    </div>
  );
}
