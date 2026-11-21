import { useContext } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, ShoppingBag, Plus, Minus } from "lucide-react";
import { BasketContext, SessionContext } from "../../app/contexts";
import { Notice } from "../../components/Feedback";
import {
  getBasketQuantityForVariant,
  getProductTotalPriceCents,
  isProductAvailable,
  money,
  parseBasketItemId,
  getStorefrontProduct,
  useRecords,
  type Product,
  type Taxonomy,
} from "../../data";
import {
  getProductStock,
  isNecklaceCategory,
} from "../../data/productAvailability";

export function Cart() {
  const session = useContext(SessionContext);
  const { items, change } = useContext(BasketContext);
  const navigate = useNavigate();
  const products = useRecords<Product>("products");
  const categories = useRecords<Taxonomy>("categories");
  const lines = useRecords<Taxonomy>("collections");
  const colors = useRecords<Taxonomy>("colors");
  const visibleProducts = products.data
    .map((product) =>
      getStorefrontProduct(product, categories.data, lines.data, colors.data),
    )
    .filter((product): product is Product => Boolean(product));
  if (session.admin) return <Navigate to="/admin" replace />;
  const entries = Object.entries(items);
  const total = entries.reduce((sum, [id, quantity]) => {
    const selection = parseBasketItemId(id);
    const product = visibleProducts.find(
      (item) => item.id === selection.productId,
    );
    const chainPrice = isNecklaceCategory(
      categories.data.find((category) => category.id === product?.categoryId),
    );
    const unitPrice = getProductTotalPriceCents(product, chainPrice);
    return sum + unitPrice * quantity;
  }, 0);
  const canCheckout =
    entries.length > 0 &&
    !products.loading &&
    !categories.loading &&
    !lines.loading &&
    !colors.loading &&
    !products.error &&
    entries.every(([id]) => {
      const selection = parseBasketItemId(id);
      const product = visibleProducts.find(
        (item) => item.id === selection.productId,
      );
      if (!product) return false;
      const variant = product.colorVariants?.find(
        (item) => item.colorId === selection.variantId,
      );
      const variantRequired = Boolean(product.colorVariants?.length);
      const variantStock = variantRequired
        ? (variant?.stock ?? -1)
        : selection.variantId
          ? -1
          : getProductStock(product);
      const quantity = getBasketQuantityForVariant(
        items,
        product.id,
        selection.variantId,
      );
      return Boolean(
        isProductAvailable(product) &&
        (!variantRequired || variant) &&
        quantity <= variantStock,
      );
    });
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
              const selection = parseBasketItemId(id);
              const p = visibleProducts.find(
                (product) => product.id === selection.productId,
              );
              const variant = p?.colorVariants?.find(
                (item) => item.colorId === selection.variantId,
              );
              const variantRequired = Boolean(p?.colorVariants?.length);
              const variantStock = variantRequired
                ? (variant?.stock ?? 0)
                : (p?.stock ?? 0);
              const quantityForVariant = p
                ? getBasketQuantityForVariant(items, p.id, selection.variantId)
                : q;
              const itemAvailable = Boolean(
                p &&
                isProductAvailable(p) &&
                (!variantRequired || variant) &&
                quantityForVariant <= variantStock,
              );
              const necklace = isNecklaceCategory(
                categories.data.find(
                  (category) => category.id === p?.categoryId,
                ),
              );
              const itemPrice = getProductTotalPriceCents(p, necklace);
              return (
                <article className="cart-row" key={id}>
                  <div>
                    <h3>{p?.name || "Peça indisponível"}</h3>
                    <p>{p ? money(itemPrice) : "—"}</p>
                    {variantRequired && (
                      <p className="cart-variant-detail">
                        Cor: {variant?.colorName || "não selecionada"}
                      </p>
                    )}
                    {!itemAvailable && (
                      <p role="alert" className="notice">
                        {variantRequired && !variant
                          ? "Escolha novamente uma cor para esta peça."
                          : "Disponibilidade alterada. Ajuste ou remova este item."}
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
                        !p ||
                        !isProductAvailable(p) ||
                        (variantRequired && !variant) ||
                        quantityForVariant >= variantStock
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
            <button
              className="button"
              disabled={!canCheckout}
              onClick={() => navigate("/checkout")}
            >
              Ir para a entrega <ArrowRight size={18} />
            </button>
            <p className="muted">
              Compra de demonstração. Nenhum pagamento real será cobrado.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
