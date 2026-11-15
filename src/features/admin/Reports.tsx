import { useState } from "react";
import { Info } from "lucide-react";
import { ReportChart } from "./ReportChart";
import { ReportFilters } from "./ReportFilters";
import { ReportMetrics } from "./ReportMetrics";
import { ReportTable } from "./ReportTable";
import {
  buildReportSummary,
  getDemoReportOptions,
  getDemoReportSales,
  localDateInputValue,
} from "./reportModel";
import type { ReportGrouping } from "./reportTypes";

const groupNames: Record<ReportGrouping, string> = {
  line: "linha",
  type: "tipo de peça",
  product: "produto",
  month: "mês",
};

export function AdminReports() {
  const [today] = useState(() => {
    const value = new Date();
    value.setHours(12, 0, 0, 0);
    return value;
  });
  const [fromDate, setFromDate] = useState(() => {
    const value = new Date();
    value.setDate(value.getDate() - 29);
    return localDateInputValue(value);
  });
  const [toDate, setToDate] = useState(() => localDateInputValue(new Date()));
  const [lineFilter, setLineFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [grouping, setGrouping] = useState<ReportGrouping>("type");

  const summary = buildReportSummary(getDemoReportSales(today), {
    fromDate,
    toDate,
    lineFilter,
    typeFilter,
    productFilter,
    grouping,
  });
  const options = getDemoReportOptions();

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
        <span className="report-demo-label">
          <Info size={15} /> Dados fictícios
        </span>
      </div>
      <div className="report-demo-note" role="note">
        Estes dados são apenas exemplos para demonstrar os filtros e gráficos.
        Não representam vendas reais.
      </div>
      <ReportFilters
        fromDate={fromDate}
        toDate={toDate}
        lineFilter={lineFilter}
        typeFilter={typeFilter}
        productFilter={productFilter}
        grouping={grouping}
        options={options}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onLineChange={setLineFilter}
        onTypeChange={setTypeFilter}
        onProductChange={setProductFilter}
        onGroupingChange={setGrouping}
      />
      <ReportMetrics
        unitsSold={summary.unitsSold}
        orderCount={summary.orderCount}
        revenueCents={summary.revenueCents}
        bestSeller={summary.bestSeller}
      />
      <ReportChart
        grouping={grouping}
        groupName={groupNames[grouping]}
        groups={summary.groups}
        unitsSold={summary.unitsSold}
        maxGroupUnits={summary.maxGroupUnits}
        pieGradient={summary.pieGradient}
      />
      <ReportTable groupName={groupNames[grouping]} groups={summary.groups} />
    </section>
  );
}
