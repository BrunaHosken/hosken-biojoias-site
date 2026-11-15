export type ReportGrouping = "line" | "type" | "product" | "month";

export type DemoReportSale = {
  orderNumber: string;
  daysAgo: number;
  productId: string;
  productName: string;
  lineId: string;
  lineName: string;
  typeId: string;
  typeName: string;
  quantity: number;
  unitPriceCents: number;
  paymentStatus: "approved" | "cancelled" | "refunded";
};

export type ReportSale = DemoReportSale & { date: Date };

export type ReportGroup = {
  key: string;
  label: string;
  quantity: number;
  revenueCents: number;
  orderCount: number;
  sortValue: number;
};

export type ReportFilters = {
  fromDate: string;
  toDate: string;
  lineFilter: string;
  typeFilter: string;
  productFilter: string;
  grouping: ReportGrouping;
};

export type ReportSummary = {
  filteredSales: ReportSale[];
  groups: ReportGroup[];
  unitsSold: number;
  revenueCents: number;
  orderCount: number;
  bestSeller?: { name: string; quantity: number };
  maxGroupUnits: number;
  pieGradient: string;
};

export type ReportOptions = {
  lines: [string, string][];
  types: [string, string][];
  products: [string, string][];
};
