"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { errorMessage, formatDate, formatPercent } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

const iconProps = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;

export default function OverviewPage() {
  const { admin } = useAdmin();
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then((res) => setStats(res.data))
      .catch((err) => setError(errorMessage(err, "Failed to load dashboard")))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        {
          label: "Students",
          value: stats.total_students,
          href: "/students",
          tone: "",
          icon: (
            <svg {...iconProps}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
          ),
        },
        {
          label: "Tutors",
          value: stats.total_tutors,
          href: "/tutors",
          tone: "lime",
          icon: (
            <svg {...iconProps}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          ),
        },
        {
          label: "Courses",
          value: stats.total_courses,
          href: "/courses",
          tone: "sage",
          icon: (
            <svg {...iconProps}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          ),
        },
        {
          label: `Exams (${stats.practice_exams_count} practice · ${stats.live_exams_count} live)`,
          value: stats.total_exams,
          href: "/exams",
          tone: "",
          icon: (
            <svg {...iconProps}>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          ),
        },
        {
          label: "Exams Completed",
          value: stats.total_attempts_completed,
          href: "/results",
          tone: "gold",
          icon: (
            <svg {...iconProps}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          ),
        },
        {
          label: "Overall Pass Rate",
          value: formatPercent(stats.overall_pass_rate),
          href: "/results",
          tone: "lime",
          icon: (
            <svg {...iconProps}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
        },
      ]
    : [];

  return (
    <div>
      <PageHeader title={`Welcome, ${admin.name.split(" ")[0]}`} subtitle="Platform-wide summary and recent activity" />

      {error && <div className="admin-error-msg">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading dashboard…</div>
      ) : (
        stats && (
          <>
            <div className="admin-stats-grid">
              {cards.map((c) => (
                <Link href={c.href} className="admin-stat-card" key={c.label}>
                  <div className={`admin-stat-icon ${c.tone}`}>{c.icon}</div>
                  <div className="admin-stat-data">
                    <span className="admin-stat-value">{String(c.value ?? "—")}</span>
                    <span className="admin-stat-label">{c.label}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="admin-overview-panels">
              <div className="admin-panel">
                <div className="admin-panel-header">
                  <h3>Recent Results</h3>
                  <Link href="/results" className="admin-panel-link">
                    View All →
                  </Link>
                </div>
                {stats.recent_attempts.length > 0 ? (
                  stats.recent_attempts.map((a) => (
                    <Link href={`/results/${a.id}`} className="admin-data-row admin-data-row-link" key={String(a.id)}>
                      <span>
                        <span className="admin-data-row-label">{a.user?.name ?? "Deleted user"}</span>
                        <span className="admin-data-row-sub">{a.exam?.title ?? "Deleted exam"}</span>
                      </span>
                      <span className={`admin-pass-badge ${a.passed ? "pass" : "fail"}`}>{formatPercent(a.percentage)}</span>
                    </Link>
                  ))
                ) : (
                  <div className="admin-empty">No exams completed yet</div>
                )}
              </div>

              <div className="admin-panel">
                <div className="admin-panel-header">
                  <h3>Newest Students</h3>
                  <Link href="/students" className="admin-panel-link">
                    View All →
                  </Link>
                </div>
                {stats.recent_students && stats.recent_students.length > 0 ? (
                  stats.recent_students.map((s) => (
                    <Link href={`/students/${s.id}`} className="admin-data-row admin-data-row-link" key={String(s.id)}>
                      <span>
                        <span className="admin-data-row-label">{s.name}</span>
                        <span className="admin-data-row-sub">{s.email}</span>
                      </span>
                      <span className="admin-data-row-value">{formatDate(s.created_at)}</span>
                    </Link>
                  ))
                ) : (
                  <div className="admin-empty">No students yet</div>
                )}
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
