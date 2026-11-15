import { Leaf } from "lucide-react";
import { POLICY_TYPES } from "../../../app/constants";
import { Notice } from "../../../components/Feedback";
import { useRecords, type Content } from "../../../data";

export function PoliciesPage() {
  const policies = useRecords<Content>("policies");
  return (
    <div className="page">
      <div className="eyebrow">INFORMAÇÕES DA LOJA</div>
      <h1>Políticas da loja</h1>
      <p className="lead">
        Consulte as informações sobre compras, entregas, trocas e privacidade.
      </p>
      <Notice {...policies} />
      <div className="content-grid">
        {policies.data.map((policy) => (
          <article className="content-card policy-card" key={policy.id}>
            <span className="policy-type">
              {POLICY_TYPES.find((type) => type.id === policy.policyType)
                ?.label || "Geral"}
            </span>
            <h2>{policy.title}</h2>
            <p>{policy.body}</p>
          </article>
        ))}
      </div>
      {!policies.loading && !policies.error && !policies.data.length && (
        <div className="empty">
          <Leaf />
          <h2>Estamos preparando estas informações.</h2>
          <p>
            As políticas de entrega, trocas e privacidade serão publicadas pelo
            ateliê antes da abertura da loja.
          </p>
        </div>
      )}
    </div>
  );
}
