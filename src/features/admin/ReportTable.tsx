import { useEffect, useState } from "react";
import { money } from "../../data";
import type { ReportGroup } from "./reportTypes";

const PAGE_SIZE = 10;

export function ReportTable({
  groupName,
  groups,
}: {
  groupName: string;
  groups: ReportGroup[];
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(groups.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const pageGroups = groups.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const firstItem = groups.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(currentPage * PAGE_SIZE, groups.length);

  useEffect(() => {
    setPage(1);
  }, [groups]);

  return (
    <section className="report-table-section" aria-label="Vendas por produto">
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>{groupName}</th>
              <th>Unidades</th>
              <th>Pedidos</th>
              <th>Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {pageGroups.map((group) => (
              <tr key={group.key}>
                <th scope="row">{group.label}</th>
                <td>{group.quantity}</td>
                <td>{group.orderCount}</td>
                <td>{money(group.revenueCents)}</td>
              </tr>
            ))}
            {!groups.length && (
              <tr>
                <td colSpan={4}>Sem resultados para os filtros selecionados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {groups.length > 0 && (
        <nav
          className="report-table-pagination"
          aria-label="Paginação dos produtos"
        >
          <span>
            Mostrando {firstItem}–{lastItem} de {groups.length} produtos
          </span>
          {pageCount > 1 && (
            <div>
              <button
                type="button"
                className="button secondary"
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span aria-live="polite">
                Página {currentPage} de {pageCount}
              </span>
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  setPage((value) => Math.min(value + 1, pageCount))
                }
                disabled={currentPage === pageCount}
              >
                Próxima
              </button>
            </div>
          )}
        </nav>
      )}
    </section>
  );
}
