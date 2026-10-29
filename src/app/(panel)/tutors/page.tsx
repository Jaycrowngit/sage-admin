"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { UserFormModal } from "@/components/UserFormModal";
import { useDebounced } from "@/components/useDebounced";
import { useQuery } from "@/components/useQuery";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { errorMessage, formatDate } from "@/lib/format";
import type { User } from "@/lib/types";

type RoleFilter = "tutor" | "admin" | "all";

export default function StaffPage() {
  const { admin } = useAdmin();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("tutor");
  const debouncedSearch = useDebounced(search);

  const [modal, setModal] = useState<{ user: User | null } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStaff = useCallback(
    () => api.staff({ page, per_page: 20, search: debouncedSearch.trim(), role }),
    [page, debouncedSearch, role]
  );
  const { data: result, loading, error, reload } = useQuery(fetchStaff, "Failed to load staff");

  async function handleDelete(user: User) {
    if (!confirm(`Delete ${user.name}'s ${user.role} account? Exams they created will be kept.`)) return;
    setDeletingId(user.id);
    try {
      await api.deleteUser(user.id);
      reload();
    } catch (err) {
      alert(errorMessage(err, "Failed to delete account."));
    } finally {
      setDeletingId(null);
    }
  }

  const staff = result?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Tutors & Staff"
        subtitle="Create tutor and administrator accounts, and see who authors your exams"
        actions={
          <button className="admin-btn-primary" onClick={() => setModal({ user: null })}>
            + Add Tutor / Admin
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
        <div className="admin-segmented" role="tablist">
          {(["tutor", "admin", "all"] as RoleFilter[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={role === r}
              className={role === r ? "active" : ""}
              onClick={() => {
                setRole(r);
                setPage(1);
              }}
            >
              {r === "tutor" ? "Tutors" : r === "admin" ? "Admins" : "All staff"}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Exams Created</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && staff.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-loading">Loading…</div>
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">No accounts found.</div>
                </td>
              </tr>
            ) : (
              staff.map((t) => {
                const isSelf = String(t.id) === String(admin.id);
                return (
                  <tr key={String(t.id)} className={loading ? "is-stale" : ""}>
                    <td className="cell-strong">
                      <Link href={`/tutors/${t.id}`} className="admin-link">
                        {t.name}
                      </Link>
                      {isSelf && <span className="admin-you-tag">You</span>}
                    </td>
                    <td>{t.email}</td>
                    <td>{t.phone || "—"}</td>
                    <td>
                      <span className={`admin-role-badge ${t.role}`}>{t.role}</span>
                    </td>
                    <td>{t.created_exams_count ?? 0}</td>
                    <td className="cell-muted">{formatDate(t.created_at)}</td>
                    <td>
                      <div className="admin-table-actions">
                        <Link href={`/tutors/${t.id}`} className="admin-btn-secondary">
                          View
                        </Link>
                        <button className="admin-btn-secondary" onClick={() => setModal({ user: t })}>
                          Edit
                        </button>
                        {!isSelf && (
                          <button
                            className="admin-btn-danger"
                            onClick={() => handleDelete(t)}
                            disabled={deletingId === t.id}
                          >
                            {deletingId === t.id ? "…" : "Delete"}
                          </button>
                        )}
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
          defaultRole={modal.user?.role ?? "tutor"}
          allowedRoles={
            modal.user && String(modal.user.id) === String(admin.id)
              ? ["admin"]
              : modal.user
                ? ["student", "tutor", "admin"]
                : ["tutor", "admin"]
          }
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
