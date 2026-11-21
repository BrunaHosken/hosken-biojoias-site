export function Pagination({
  page,
  pageCount,
  onChange,
  label,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  label: string;
}) {
  if (pageCount < 2) return null;

  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <nav className="admin-list-pagination" aria-label={label}>
      <button
        type="button"
        className="button secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <div className="admin-list-page-numbers">
        {start > 1 && (
          <>
            <button type="button" aria-label="Página 1" aria-current={page === 1 ? "page" : undefined} onClick={() => onChange(1)}>1</button>
            {start > 2 && <span aria-hidden="true">…</span>}
          </>
        )}
        {pages.map((number) => (
          <button
            type="button"
            key={number}
            aria-label={`Página ${number}`}
            aria-current={page === number ? "page" : undefined}
            className={page === number ? "is-active" : ""}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        ))}
        {end < pageCount && (
          <>
            {end < pageCount - 1 && <span aria-hidden="true">…</span>}
            <button type="button" aria-label={`Página ${pageCount}`} onClick={() => onChange(pageCount)}>{pageCount}</button>
          </>
        )}
      </div>
      <button
        type="button"
        className="button secondary"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}
