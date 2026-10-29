"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@/components/useQuery";
import { api } from "@/lib/api";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

function duration(start?: string, end?: string): string {
  if (!start || !end) return "—";
  const secs = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const fetchResult = useCallback(() => api.result(id), [id]);
  const { data, loading, error } = useQuery(fetchResult, "Failed to load result");

  const back = { href: "/results", label: "Back to Results" };

  if (loading && !data) return <div className="admin-loading">Loading result…</div>;
  if (!data) {
    return (
      <>
        <PageHeader title="Result" back={back} />
        {error && <div className="admin-error-msg">{error}</div>}
      </>
    );
  }

  const { attempt, answers } = data;

  return (
    <div>
      <PageHeader
        title={attempt.exam_title ?? "Deleted exam"}
        subtitle={
          <>
            {attempt.exam_type && <span className={`admin-type-badge ${attempt.exam_type}`}>{attempt.exam_type}</span>}{" "}
            {attempt.course ?? ""} · Submitted {formatDate(attempt.submitted_at, true)}
          </>
        }
        back={back}
        actions={
          attempt.exam_id && (
            <Link href={`/exams/${attempt.exam_id}/submissions`} className="admin-btn-secondary">
              All submissions for this exam
            </Link>
          )
        }
      />

      <div className="admin-detail-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h3>Student</h3>
            {attempt.student && (
              <Link href={`/students/${attempt.student.id}`} className="admin-panel-link">
                View profile →
              </Link>
            )}
          </div>
          {attempt.student ? (
            <>
              <div className="admin-data-row">
                <span className="admin-data-row-label">Name</span>
                <span className="admin-data-row-value">{attempt.student.name}</span>
              </div>
              <div className="admin-data-row">
                <span className="admin-data-row-label">Email</span>
                <span className="admin-data-row-value">{attempt.student.email}</span>
              </div>
              <div className="admin-data-row">
                <span className="admin-data-row-label">Phone</span>
                <span className="admin-data-row-value">{attempt.student.phone || "—"}</span>
              </div>
            </>
          ) : (
            <div className="admin-empty">This student account was deleted.</div>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-panel-header">
            <h3>Score</h3>
            <span className={`admin-pass-badge ${attempt.passed ? "pass" : "fail"}`}>
              {attempt.passed ? "Passed" : "Failed"}
            </span>
          </div>
          <div className="admin-mini-stats">
            <div>
              <strong>{formatPercent(attempt.percentage)}</strong>
              <span>
                {formatNumber(attempt.score)} / {formatNumber(attempt.total_possible)} marks
              </span>
            </div>
            <div>
              <strong className="text-pass">{attempt.correct_answers_count}</strong>
              <span>Correct</span>
            </div>
            <div>
              <strong className="text-fail">{attempt.incorrect_answers_count}</strong>
              <span>Wrong</span>
            </div>
            <div>
              <strong>{attempt.unanswered_count}</strong>
              <span>Skipped</span>
            </div>
            <div>
              <strong>{duration(attempt.started_at, attempt.submitted_at)}</strong>
              <span>Time taken</span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="admin-section-title">Answer Breakdown</h2>
      {answers.length === 0 ? (
        <div className="admin-empty boxed">No answers recorded.</div>
      ) : (
        <div className="admin-question-list">
          {answers.map((a, i) => {
            const state = a.is_correct ? "correct" : a.selected_option ? "wrong" : "skipped";
            return (
              <div key={String(a.question_id)} className={`admin-question-card answer-${state}`}>
                <div className="admin-question-card-header">
                  <span className="admin-question-number">Question {i + 1}</span>
                  <span className="admin-question-marks">
                    {formatNumber(a.marks_awarded)} / {formatNumber(a.marks)} ·{" "}
                    {state === "correct" ? "Correct" : state === "wrong" ? "Wrong" : "Skipped"}
                  </span>
                </div>
                <p className="admin-question-text">{a.question_text}</p>
                <div className="admin-question-options">
                  <div className={`admin-question-option${a.is_correct ? " correct" : a.selected_option ? " wrong" : ""}`}>
                    <span className="admin-answer-label">Student answered:</span>
                    {a.selected_option ? `${a.selected_option.letter}. ${a.selected_option.text}` : "— (skipped)"}
                  </div>
                  {!a.is_correct && a.correct_option && (
                    <div className="admin-question-option correct">
                      <span className="admin-answer-label">Correct answer:</span>
                      {a.correct_option.letter}. {a.correct_option.text}
                    </div>
                  )}
                </div>
                {a.explanation && (
                  <div className="admin-question-explanation">
                    <strong>Explanation:</strong> {a.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
