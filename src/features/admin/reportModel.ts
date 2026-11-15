import { DEMO_REPORT_SALES, REPORT_COLORS } from "./reportFixtures";
import type {
  ReportFilters,
  ReportOptions,
  ReportSale,
  ReportSummary,
} from "./reportTypes";

export function localDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getDemoReportSales(today: Date): ReportSale[] {
  return DEMO_REPORT_SALES.map((sale) => {
    const date = new Date(today);
    date.setDate(date.getDate() - sale.daysAgo);
    return { ...sale, date };
  });
}

export function getDemoReportOptions(): ReportOptions {
  return {
    lines: Array.from(
      new Map(DEMO_REPORT_SALES.map((sale) => [sale.lineId, sale.lineName])),
    ),
    types: Array.from(
      new Map(DEMO_REPORT_SALES.map((sale) => [sale.typeId, sale.typeName])),
    ),
    products: Array.from(
      new Map(
        DEMO_REPORT_SALES.map((sale) => [sale.productId, sale.productName]),
      ),
    ),
  };
}

export function buildReportSummary(
  sales: ReportSale[],
  filters: ReportFilters,
): ReportSummary {
  const start = filters.fromDate
    ? new Date(`${filters.fromDate}T00:00:00`)
    : null;
  const end = filters.toDate
    ? new Date(`${filters.toDate}T23:59:59.999`)
    : null;
  const filteredSales = sales.filter(
    (sale) =>
      sale.paymentStatus === "approved" &&
      (!start || sale.date >= start) &&
      (!end || sale.date <= end) &&
      (!filters.lineFilter || sale.lineId === filters.lineFilter) &&
      (!filters.typeFilter || sale.typeId === filters.typeFilter) &&
      (!filters.productFilter || sale.productId === filters.productFilter),
  );
  const grouped = new Map<
    string,
    {
      key: string;
      label: string;
      quantity: number;
      revenueCents: number;
      orderIds: Set<string>;
      sortValue: number;
    }
  >();

  for (const sale of filteredSales) {
    let key = "";
    let label = "";
    let sortValue = 0;
    if (filters.grouping === "line") {
      key = sale.lineId;
      label = sale.lineName;
    } else if (filters.grouping === "type") {
      key = sale.typeId;
      label = sale.typeName;
    } else if (filters.grouping === "product") {
      key = sale.productId;
      label = sale.productName;
    } else {
      const year = sale.date.getFullYear();
      const month = sale.date.getMonth();
      key = `${year}-${String(month + 1).padStart(2, "0")}`;
      label = new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        year: "numeric",
      }).format(sale.date);
      sortValue = year * 12 + month;
    }
    const group = grouped.get(key) || {
      key,
      label,
      quantity: 0,
      revenueCents: 0,
      orderIds: new Set<string>(),
      sortValue,
    };
    group.quantity += sale.quantity;
    group.revenueCents += sale.quantity * sale.unitPriceCents;
    group.orderIds.add(sale.orderNumber);
    grouped.set(key, group);
  }

  const groups = Array.from(grouped.values()).map((group) => ({
    ...group,
    orderCount: group.orderIds.size,
  }));
  groups.sort((a, b) =>
    filters.grouping === "month"
      ? a.sortValue - b.sortValue
      : b.quantity - a.quantity,
  );
  const unitsSold = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const revenueCents = filteredSales.reduce(
    (sum, sale) => sum + sale.quantity * sale.unitPriceCents,
    0,
  );
  const orderCount = new Set(filteredSales.map((sale) => sale.orderNumber))
    .size;
  const productTotals = new Map<string, { name: string; quantity: number }>();
  for (const sale of filteredSales) {
    const item = productTotals.get(sale.productId) || {
      name: sale.productName,
      quantity: 0,
    };
    item.quantity += sale.quantity;
    productTotals.set(sale.productId, item);
  }
  const bestSeller = Array.from(productTotals.values()).sort(
    (a, b) => b.quantity - a.quantity,
  )[0];
  let progress = 0;
  const pieGradient = groups.length
    ? `conic-gradient(${groups
        .map((group, index) => {
          const from = (progress / unitsSold) * 100;
          progress += group.quantity;
          const to = (progress / unitsSold) * 100;
          return `${REPORT_COLORS[index % REPORT_COLORS.length]} ${from}% ${to}%`;
        })
        .join(", ")})`
    : "conic-gradient(#e8e1d8 0% 100%)";

  return {
    filteredSales,
    groups,
    unitsSold,
    revenueCents,
    orderCount,
    bestSeller,
    maxGroupUnits: Math.max(...groups.map((group) => group.quantity), 1),
    pieGradient,
  };
}
