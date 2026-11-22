import type { ReportOptions } from "./reportTypes";

type ReportFiltersProps = {
  fromDate: string;
  toDate: string;
  lineFilter: string;
  typeFilter: string;
  productFilter: string;
  options: ReportOptions;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onLineChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onProductChange: (value: string) => void;
};

export function ReportFilters({
  fromDate,
  toDate,
  lineFilter,
  typeFilter,
  productFilter,
  options,
  onFromDateChange,
  onToDateChange,
  onLineChange,
  onTypeChange,
  onProductChange,
}: ReportFiltersProps) {
  return (
    <div className="report-filters">
      <label>
        De
        <input
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
        />
      </label>
      <label>
        Até
        <input
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
        />
      </label>
      <label>
        Linha
        <select
          value={lineFilter}
          onChange={(event) => onLineChange(event.target.value)}
        >
          <option value="">Todas</option>
          {options.lines.map(([id, name]) => (
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
          onChange={(event) => onTypeChange(event.target.value)}
        >
          <option value="">Todos</option>
          {options.types.map(([id, name]) => (
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
          onChange={(event) => onProductChange(event.target.value)}
        >
          <option value="">Todos</option>
          {options.products.map(([id, name]) => (
            <option value={id} key={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
