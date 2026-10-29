"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { useDebounced } from "@/components/useDebounced";
import { useQuery } from "@/components/useQuery";
import { api, type ResultFilters } from "@/lib/api";
import { downloadCSV, errorMessage, formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { Course } from "@/lib/types";

export default function ResultsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [passed, setPassed] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebounced(search);

  const filters: ResultFilters = { search: debouncedSearch.trim(), type, passed, course_id: courseId };

  const fetchResults = useCallback(
    () => api.results({ page, per_page: 25, search: debouncedSearch.trim(), type, passed, course_id: courseId }),
    [page, debouncedSearch, type, passed, courseId]
  );
  const { data: result, loading, error } = useQuery(fetchResults, "Failed to load results");

  useEffect(() => {
    api
      .courses()
      .then((res) => setCourses(res.data ?? []))
      .catch(() => {});
  }, []);

  function changeFilter(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.exportResults(filters);
      const records = res.data.records;
      if (records.length === 0) {
        alert("No results match the current filters.");
        return;
      }
      downloadCSV(
        `sage-results-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Student",
          "Email",
          "Phone",
          "Course",
          "Course Code",
          "Exam",
          "Type",
          "Score",
          "Total",
          "Percentage",
          "Pass Mark",
          "Status",
          "Correct",
          "Incorrect",
          "Unanswered",
          "Submitted",
        ],
        records.map((r) => [
          r.student_name,
          r.student_email,
          r.student_phone,
          r.course,
          r.course_code,
          r.exam_title,
          r.exam_type,
          r.score,
          r.total_possible,
          r.percentage,
          r.pass_percentage,
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

  const rows = result?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Results"
        subtitle={`${result?.total ?? 0} completed exam${result?.total === 1 ? "" : "s"} across all students`}
        actions={
          <button className="admin-btn-primary" onClick={handleExport} disabled={exporting || !result?.total}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        }
      />

      {error && <div className="admin-error-msg">{error}</div>}

      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-search-input"
          placeholder="Search student name or email…"
          value={search}
          onChange={changeFilter(setSearch)}
        />
        <div className="admin-toolbar-group">
          <select className="admin-filter-select" value={courseId} onChange={changeFilter(setCourseId)}>
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="admin-filter-select" value={type} onChange={changeFilter(setType)}>
            <option value="">All types</option>
            <option value="practice">Practice</option>
            <option value="live">Live</option>
          </select>
          <select className="admin-filter-select" value={passed} onChange={changeFilter(setPassed)}>
            <option value="">Passed & failed</option>
            <option value="1">Passed only</option>
            <option value="0">Failed only</option>
          </select>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Exam</th>
              <th>Course</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-loading">Loading results…</div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-empty">No results found.</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={String(r.id)} className={loading ? "is-stale" : ""}>
                  <td>
                    {r.user ? (
                      <Link href={`/students/${r.user.id}`} className="admin-link cell-strong">
                        {r.user.name}
                      </Link>
                    ) : (
                      <span className="cell-muted">Deleted user</span>
                    )}
                    {r.user?.email && <span className="admin-data-row-sub">{r.user.email}</span>}
                  </td>
                  <td>
                    {r.exam ? (
                      <Link href={`/exams/${r.exam.id}/submissions`} className="admin-link">
                        {r.exam.title}
                      </Link>
                    ) : (
                      <span className="cell-muted">Deleted exam</span>
                    )}
                    {r.exam && <span className={`admin-type-badge ${r.exam.type} inline`}>{r.exam.type}</span>}
                  </td>
                  <td>{r.exam?.course?.name ?? "—"}</td>
                  <td>
                    {formatNumber(r.score)} / {formatNumber(r.total_possible)}
                  </td>
                  <td>{formatPercent(r.percentage)}</td>
                  <td>
                    <span className={`admin-pass-badge ${r.passed ? "pass" : "fail"}`}>{r.passed ? "Passed" : "Failed"}</span>
                  </td>
                  <td className="cell-muted">{formatDate(r.submitted_at, true)}</td>
                  <td>
                    <Link href={`/results/${r.id}`} className="admin-btn-secondary">
                      Review
                    </Link>
                  </td>
                </tr>
              ))
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
    </div>
  );
}
