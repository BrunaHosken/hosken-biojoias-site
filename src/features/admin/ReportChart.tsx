import { REPORT_COLORS } from "./reportFixtures";
import type { ReportGroup } from "./reportTypes";

export function ReportChart({
  groupName,
  groups,
  unitsSold,
  pieGradient,
}: {
  groupName: string;
  groups: ReportGroup[];
  unitsSold: number;
  pieGradient: string;
}) {
  return (
    <div className="report-chart-card">
      <div className="report-card-heading">
        <div>
          <h3>Vendas por {groupName}</h3>
          <p>Distribuição pela quantidade de unidades vendidas.</p>
        </div>
        <span>
          {unitsSold} {unitsSold === 1 ? "unidade" : "unidades"}
        </span>
      </div>
      {!groups.length ? (
        <p className="report-empty">
          Nenhuma venda concluída encontrada com estes filtros.
        </p>
      ) : (
        <div className="report-donut-layout">
          <div
            className="report-donut"
            style={{ background: pieGradient }}
            role="img"
            aria-label={`Gráfico de rosca de vendas por ${groupName}`}
          >
            <span>
              <strong>{unitsSold}</strong>
              <small>unidades</small>
            </span>
          </div>
          <ul className="report-legend">
            {groups.map((group, index) => (
              <li key={group.key}>
                <span
                  style={{
                    background: REPORT_COLORS[index % REPORT_COLORS.length],
                  }}
                />
                <strong>{group.label}</strong>
                <small>
                  {group.quantity} ·{" "}
                  {unitsSold
                    ? Math.round((group.quantity / unitsSold) * 100)
                    : 0}
                  %
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
