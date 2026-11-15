import { money } from "../../data";

export function ReportMetrics({
  unitsSold,
  orderCount,
  revenueCents,
  bestSeller,
}: {
  unitsSold: number;
  orderCount: number;
  revenueCents: number;
  bestSeller?: { name: string; quantity: number };
}) {
  return (
    <div className="report-metrics">
      <article>
        <small>UNIDADES VENDIDAS</small>
        <strong>{unitsSold}</strong>
        <span>No período selecionado</span>
      </article>
      <article>
        <small>PEDIDOS PAGOS</small>
        <strong>{orderCount}</strong>
        <span>Sem cancelamentos ou reembolsos</span>
      </article>
      <article>
        <small>FATURAMENTO BRUTO</small>
        <strong>{money(revenueCents)}</strong>
        <span>Valores de demonstração</span>
      </article>
      <article>
        <small>MAIS VENDIDO</small>
        <strong>{bestSeller?.name || "—"}</strong>
        <span>
          {bestSeller
            ? `${bestSeller.quantity} unidades no período`
            : "Sem vendas no período"}
        </span>
      </article>
    </div>
  );
}
