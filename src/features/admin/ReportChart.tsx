import { money } from "../../data";
import { REPORT_COLORS } from "./reportFixtures";
import type { ReportGroup, ReportGrouping } from "./reportTypes";

export function ReportChart({
  grouping,
  groupName,
  groups,
  unitsSold,
  maxGroupUnits,
  pieGradient,
}: {
  grouping: ReportGrouping;
  groupName: string;
  groups: ReportGroup[];
  unitsSold: number;
  maxGroupUnits: number;
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
          Nenhuma venda fictícia encontrada com estes filtros.
        </p>
      ) : grouping === "line" || grouping === "type" ? (
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
      ) : (
        <div
          className="report-bars"
          role="img"
          aria-label={`Gráfico de barras de vendas por ${groupName}`}
        >
          {groups.slice(0, 8).map((group, index) => (
            <div className="report-bar-row" key={group.key}>
              <div>
                <strong>{group.label}</strong>
                <span>
                  {group.quantity} un. · {money(group.revenueCents)}
                </span>
              </div>
              <div className="report-bar-track">
                <span
                  style={{
                    width: `${(group.quantity / maxGroupUnits) * 100}%`,
                    background: REPORT_COLORS[index % REPORT_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
