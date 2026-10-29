type PaginationProps = {
  page: number;
  lastPage: number;
  total: number;
  from?: number | null;
  to?: number | null;
  onChange: (page: number) => void;
};

export function Pagination({ page, lastPage, total, from, to, onChange }: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="admin-pagination">
      <span>
        Showing {from ?? 0}–{to ?? 0} of {total}
      </span>
      <div className="admin-pagination-controls">
        <button className="admin-btn-secondary" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          ← Prev
        </button>
        <span className="admin-pagination-page">
          Page {page} of {Math.max(lastPage, 1)}
        </span>
        <button className="admin-btn-secondary" onClick={() => onChange(page + 1)} disabled={page >= lastPage}>
          Next →
        </button>
      </div>
    </div>
  );
}
