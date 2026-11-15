import { useState } from "react";
import { Info } from "lucide-react";
import { money } from "../../data";

type DemoReportSale = {
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
const DEMO_REPORT_SALES: DemoReportSale[] = [
  {
    orderNumber: "DEMO-501",
    daysAgo: 1,
    productId: "brinco-orquidea",
    productName: "Brinco Orquídea",
    lineId: "biojoias",
    lineName: "Biojoias",
    typeId: "brincos",
    typeName: "Brincos",
    quantity: 2,
    unitPriceCents: 8900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-502",
    daysAgo: 2,
    productId: "colar-orquidea",
    productName: "Colar Orquídea",
    lineId: "biojoias",
    lineName: "Biojoias",
    typeId: "colares",
    typeName: "Colares",
    quantity: 1,
    unitPriceCents: 17900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-503",
    daysAgo: 4,
    productId: "conjunto-orquidea",
    productName: "Conjunto Orquídea",
    lineId: "biojoias",
    lineName: "Biojoias",
    typeId: "conjuntos",
    typeName: "Conjuntos",
    quantity: 1,
    unitPriceCents: 24900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-503",
    daysAgo: 4,
    productId: "brinco-folha",
    productName: "Brinco Folha em Cobre",
    lineId: "eletroformacao",
    lineName: "Eletroformação",
    typeId: "brincos",
    typeName: "Brincos",
    quantity: 1,
    unitPriceCents: 11900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-504",
    daysAgo: 6,
    productId: "colar-botanico",
    productName: "Colar Botânico",
    lineId: "eletroformacao",
    lineName: "Eletroformação",
    typeId: "colares",
    typeName: "Colares",
    quantity: 1,
    unitPriceCents: 22900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-505",
    daysAgo: 8,
    productId: "brinco-mini",
    productName: "Brinco Mini Orquídea",
    lineId: "biojoias",
    lineName: "Biojoias",
    typeId: "brincos",
    typeName: "Brincos",
    quantity: 1,
    unitPriceCents: 6900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-506",
    daysAgo: 12,
    productId: "mini-jardim",
    productName: "Mini Jardim de Flores Secas",
    lineId: "flores-secas",
    lineName: "Flores secas",
    typeId: "decoracao",
    typeName: "Decoração",
    quantity: 1,
    unitPriceCents: 12900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-507",
    daysAgo: 16,
    productId: "brinco-folha",
    productName: "Brinco Folha em Cobre",
    lineId: "eletroformacao",
    lineName: "Eletroformação",
    typeId: "brincos",
    typeName: "Brincos",
    quantity: 2,
    unitPriceCents: 11900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-508",
    daysAgo: 19,
    productId: "colar-orquidea",
    productName: "Colar Orquídea",
    lineId: "biojoias",
    lineName: "Biojoias",
    typeId: "colares",
    typeName: "Colares",
    quantity: 1,
    unitPriceCents: 17900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-509",
    daysAgo: 24,
    productId: "arranjo-petalas",
    productName: "Arranjo Pétalas",
    lineId: "flores-secas",
    lineName: "Flores secas",
    typeId: "decoracao",
    typeName: "Decoração",
    quantity: 2,
    unitPriceCents: 14900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-510",
    daysAgo: 31,
    productId: "colar-botanico",
    productName: "Colar Botânico",
    lineId: "eletroformacao",
    lineName: "Eletroformação",
    typeId: "colares",
    typeName: "Colares",
    quantity: 1,
    unitPriceCents: 22900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-511",
    daysAgo: 38,
    productId: "conjunto-orquidea",
    productName: "Conjunto Orquídea",
    lineId: "biojoias",
    lineName: "Biojoias",
    typeId: "conjuntos",
    typeName: "Conjuntos",
    quantity: 1,
    unitPriceCents: 24900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-512",
    daysAgo: 49,
    productId: "mini-jardim",
    productName: "Mini Jardim de Flores Secas",
    lineId: "flores-secas",
    lineName: "Flores secas",
    typeId: "decoracao",
    typeName: "Decoração",
    quantity: 1,
    unitPriceCents: 12900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-513",
    daysAgo: 61,
    productId: "brinco-folha",
    productName: "Brinco Folha em Cobre",
    lineId: "eletroformacao",
    lineName: "Eletroformação",
    typeId: "brincos",
    typeName: "Brincos",
    quantity: 1,
    unitPriceCents: 11900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-514",
    daysAgo: 74,
    productId: "colar-orquidea",
    productName: "Colar Orquídea",
    lineId: "biojoias",
    lineName: "Biojoias",
    typeId: "colares",
    typeName: "Colares",
    quantity: 1,
    unitPriceCents: 17900,
    paymentStatus: "approved",
  },
  {
    orderNumber: "DEMO-515",
    daysAgo: 88,
    productId: "brinco-orquidea",
    productName: "Brinco Orquídea",
    lineId: "biojoias",
    lineName: "Biojoias",
    typeId: "brincos",
    typeName: "Brincos",
    quantity: 2,
    unitPriceCents: 8900,
    paymentStatus: "cancelled",
  },
  {
    orderNumber: "DEMO-516",
    daysAgo: 20,
    productId: "colar-orquidea",
    productName: "Colar Orquídea",
    lineId: "biojoias",
    lineName: "Biojoias",
    typeId: "colares",
    typeName: "Colares",
    quantity: 1,
    unitPriceCents: 17900,
    paymentStatus: "refunded",
  },
];
const REPORT_COLORS = [
  "#701b34",
  "#b86b68",
  "#cf9d68",
  "#617b52",
  "#8d7195",
  "#4d7d83",
  "#d2b785",
];
type ReportGrouping = "line" | "type" | "product" | "month";
function localDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
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
  const sales = DEMO_REPORT_SALES.map((sale) => {
    const date = new Date(today);
    date.setDate(date.getDate() - sale.daysAgo);
    return { ...sale, date };
  });
  const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const end = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
  const filteredSales = sales.filter(
    (sale) =>
      sale.paymentStatus === "approved" &&
      (!start || sale.date >= start) &&
      (!end || sale.date <= end) &&
      (!lineFilter || sale.lineId === lineFilter) &&
      (!typeFilter || sale.typeId === typeFilter) &&
      (!productFilter || sale.productId === productFilter),
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
    if (grouping === "line") {
      key = sale.lineId;
      label = sale.lineName;
    } else if (grouping === "type") {
      key = sale.typeId;
      label = sale.typeName;
    } else if (grouping === "product") {
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
    grouping === "month" ? a.sortValue - b.sortValue : b.quantity - a.quantity,
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
  const groupNames: Record<ReportGrouping, string> = {
    line: "linha",
    type: "tipo de peça",
    product: "produto",
    month: "mês",
  };
  const maxGroupUnits = Math.max(...groups.map((group) => group.quantity), 1);
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
  const lineOptions = Array.from(
    new Map(DEMO_REPORT_SALES.map((sale) => [sale.lineId, sale.lineName])),
  );
  const typeOptions = Array.from(
    new Map(DEMO_REPORT_SALES.map((sale) => [sale.typeId, sale.typeName])),
  );
  const productOptions = Array.from(
    new Map(
      DEMO_REPORT_SALES.map((sale) => [sale.productId, sale.productName]),
    ),
  );
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
      <div className="report-filters">
        <label>
          De
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label>
          Até
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
        <label>
          Linha
          <select
            value={lineFilter}
            onChange={(event) => setLineFilter(event.target.value)}
          >
            <option value="">Todas</option>
            {lineOptions.map(([id, name]) => (
              <option value={id} key={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo de peça
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {typeOptions.map(([id, name]) => (
              <option value={id} key={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Produto
          <select
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {productOptions.map(([id, name]) => (
              <option value={id} key={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Agrupar por
          <select
            value={grouping}
            onChange={(event) =>
              setGrouping(event.target.value as ReportGrouping)
            }
          >
            <option value="type">Tipo de peça</option>
            <option value="line">Linha</option>
            <option value="product">Produto</option>
            <option value="month">Mês</option>
          </select>
        </label>
      </div>
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
      <div className="report-chart-card">
        <div className="report-card-heading">
          <div>
            <h3>Vendas por {groupNames[grouping]}</h3>
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
              aria-label={`Gráfico de rosca de vendas por ${groupNames[grouping]}`}
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
            aria-label={`Gráfico de barras de vendas por ${groupNames[grouping]}`}
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
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>{groupNames[grouping]}</th>
              <th>Unidades</th>
              <th>Pedidos</th>
              <th>Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.key}>
                <th scope="row">{group.label}</th>
                <td>{group.quantity}</td>
                <td>{group.orderCount}</td>
                <td>{money(group.revenueCents)}</td>
              </tr>
            ))}
            {!groups.length && (
              <tr>
                <td colSpan={4}>
                  Sem resultados para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
