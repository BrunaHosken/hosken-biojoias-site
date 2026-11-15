import { money } from "../../data";
import type { ReportGroup } from "./reportTypes";

export function ReportTable({
  groupName,
  groups,
}: {
  groupName: string;
  groups: ReportGroup[];
}) {
  return (
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
              <td colSpan={4}>Sem resultados para os filtros selecionados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
