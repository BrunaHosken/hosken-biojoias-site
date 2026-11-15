import { useContext } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { BasketContext, SessionContext } from "../../../app/contexts";
import { availability } from "../../../app/constants";
import { Notice } from "../../../components/Feedback";
import { money, useRecords, type Product } from "../../../data";
import { ProductGallery } from "./ProductVisuals";

export function ProductPage() {
  const { id } = useParams();
  const session = useContext(SessionContext);
  const products = useRecords<Product>("products");
  const { items, change } = useContext(BasketContext);
  const product = products.data.find((p) => p.id === id);
  return (
    <div className="page">
      <Link className="back" to="/loja">
        ← Voltar à loja
      </Link>
      <Notice {...products} />
      {product ? (
        <div className="product-detail">
          <ProductGallery product={product} />
          <div>
            <div className="eyebrow">UM ENCONTRO COM A NATUREZA</div>
            <h1>{product.name}</h1>
            <p className="price">{money(product.priceCents)}</p>
            <p className="description">{product.description}</p>
            {product.materials ||
            product.dimensions ||
            product.careInstructions ? (
              <dl className="product-specs">
                {product.materials && (
                  <div>
                    <dt>Materiais</dt>
                    <dd>{product.materials}</dd>
                  </div>
                )}
                {product.dimensions && (
                  <div>
                    <dt>Medidas</dt>
                    <dd>{product.dimensions}</dd>
                  </div>
                )}
                {product.careInstructions && (
                  <div>
                    <dt>Cuidados</dt>
                    <dd>{product.careInstructions}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="muted product-details-pending">
                Mais detalhes sobre materiais, medidas e cuidados serão
                adicionados em breve.
              </p>
            )}
            <p>
              {availability[product.availability]} · {product.stock} unidade(s)
            </p>
            <div className="product-actions">
              <button
                className="button"
                disabled={
                  product.availability !== "available" ||
                  product.stock <= (items[product.id] || 0)
                }
                onClick={() => change(product.id, 1)}
              >
                Adicionar à sacola <ShoppingBag size={18} />
              </button>
              {!session.admin && (
                <Link
                  className="button secondary product-chat-link"
                  to={
                    session.user
                      ? `/chat?${new URLSearchParams({
                          produto: product.id,
                          nome: product.name,
                        }).toString()}`
                      : `/conta?returnTo=${encodeURIComponent(
                          `/chat?${new URLSearchParams({
                            produto: product.id,
                            nome: product.name,
                          }).toString()}`,
                        )}`
                  }
                >
                  Tirar dúvidas sobre esta peça <MessageCircle size={18} />
                </Link>
              )}
            </div>
            {!!items[product.id] && (
              <p role="status">
                {items[product.id]} na sacola.{" "}
                <Link to="/carrinho">Ver carrinho →</Link>
              </p>
            )}
          </div>
        </div>
      ) : (
        !products.loading && !products.error && <h1>Peça não encontrada</h1>
      )}
    </div>
  );
}
