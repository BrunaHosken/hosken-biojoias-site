import { useMemo, useState } from "react";
import { ReportChart } from "./ReportChart";
import { ReportFilters } from "./ReportFilters";
import { ReportMetrics } from "./ReportMetrics";
import { ReportTable } from "./ReportTable";
import {
  buildReportSummary,
  getCompletedOrderSales,
  getReportOptions,
  localDateInputValue,
} from "./reportModel";
import { Notice } from "../../components/Feedback";
import type { CustomerOrder } from "../../data";

export function AdminReports({
  orders,
}: {
  orders: { data: CustomerOrder[]; error: string; loading: boolean };
}) {
  const [fromDate, setFromDate] = useState(() => {
    const value = new Date();
    value.setDate(value.getDate() - 29);
    return localDateInputValue(value);
  });
  const [toDate, setToDate] = useState(() => localDateInputValue(new Date()));
  const [lineFilter, setLineFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  const sales = useMemo(
    () => getCompletedOrderSales(orders.data),
    [orders.data],
  );
  const summaries = useMemo(() => {
    const filters = {
      fromDate,
      toDate,
      lineFilter,
      typeFilter,
      productFilter,
    };
    return {
      lines: buildReportSummary(sales, { ...filters, grouping: "line" }),
      types: buildReportSummary(sales, { ...filters, grouping: "type" }),
      products: buildReportSummary(sales, { ...filters, grouping: "product" }),
    };
  }, [sales, fromDate, toDate, lineFilter, typeFilter, productFilter]);
  const options = useMemo(() => getReportOptions(sales), [sales]);

  return (
    <section className="admin-reports">
      <div className="report-heading">
        <div>
          <div className="eyebrow">VISÃO DAS VENDAS</div>
          <h2>Relatórios</h2>
          <p>
            Explore os resultados por período, linha, tipo de peça ou produto.
          </p>
        </div>
      </div>
      <div className="report-data-note" role="note">
        O relatório considera somente pedidos concluídos. Pedidos cancelados e
        reembolsados ficam fora dos totais.
      </div>
      <Notice loading={orders.loading} error={orders.error} />
      {!orders.loading && !orders.error && (
        <>
          <ReportFilters
            fromDate={fromDate}
            toDate={toDate}
            lineFilter={lineFilter}
            typeFilter={typeFilter}
            productFilter={productFilter}
            options={options}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onLineChange={setLineFilter}
            onTypeChange={setTypeFilter}
            onProductChange={setProductFilter}
          />
          <ReportMetrics
            unitsSold={summaries.products.unitsSold}
            orderCount={summaries.products.orderCount}
            revenueCents={summaries.products.revenueCents}
            bestSeller={summaries.products.bestSeller}
          />
          <div className="report-chart-grid">
            <ReportChart
              groupName="linha"
              groups={summaries.lines.groups}
              unitsSold={summaries.lines.unitsSold}
              pieGradient={summaries.lines.pieGradient}
            />
            <ReportChart
              groupName="tipo de peça"
              groups={summaries.types.groups}
              unitsSold={summaries.types.unitsSold}
              pieGradient={summaries.types.pieGradient}
            />
          </div>
          <ReportTable groupName="produto" groups={summaries.products.groups} />
        </>
      )}
    </section>
  );
}
