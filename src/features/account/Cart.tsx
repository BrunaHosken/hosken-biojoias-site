import { useContext } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag, Plus, Minus } from "lucide-react";
import { BasketContext } from "../../app/contexts";
import { Notice } from "../../components/Feedback";
import { money, useRecords, type Product } from "../../data";

export function Cart() {
  const { items, change } = useContext(BasketContext);
  const products = useRecords<Product>("products");
  const entries = Object.entries(items);
  const total = entries.reduce(
    (sum, [id, q]) =>
      sum + (products.data.find((p) => p.id === id)?.priceCents || 0) * q,
    0,
  );
  return (
    <div className="page">
      <div className="eyebrow">ESCOLHIDAS POR VOCÊ</div>
      <h1>Sua sacola</h1>
      <Notice {...products} />
      {!entries.length ? (
        <div className="empty">
          <ShoppingBag />
          <h2>Uma nova história começa com uma flor.</h2>
          <Link className="button" to="/loja">
            Explorar as peças <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {entries.map(([id, q]) => {
              const p = products.data.find((p) => p.id === id);
              return (
                <article className="cart-row" key={id}>
                  <div>
                    <h3>{p?.name || "Peça indisponível"}</h3>
                    <p>{p ? money(p.priceCents) : "—"}</p>
                    {p && (q > p.stock || p.availability !== "available") && (
                      <p role="alert" className="notice">
                        Disponibilidade alterada. Ajuste ou remova este item.
                      </p>
                    )}
                  </div>
                  <div className="quantity">
                    <button
                      className="icon"
                      aria-label="Diminuir quantidade"
                      onClick={() => change(id, -1)}
                    >
                      <Minus size={16} />
                    </button>
                    <span>{q}</span>
                    <button
                      className="icon"
                      aria-label="Aumentar quantidade"
                      disabled={
                        !p || p.availability !== "available" || q >= p.stock
                      }
                      onClick={() => change(id, 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => change(id, -q)}
                  >
                    Remover
                  </button>
                </article>
              );
            })}
          </div>
          <aside className="cart-summary">
            <h2>Resumo</h2>
            <p>
              Subtotal <strong>{money(total)}</strong>
            </p>
            <p className="muted">Frete ainda não calculado.</p>
            <button className="button" disabled>
              Checkout em preparação
            </button>
            <p className="muted">
              Nenhuma cobrança será realizada. A integração de pagamento será a
              próxima etapa.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
