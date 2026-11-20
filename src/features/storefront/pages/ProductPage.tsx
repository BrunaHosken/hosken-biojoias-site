import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { BasketContext, SessionContext } from "../../../app/contexts";
import { availability } from "../../../app/constants";
import { Notice } from "../../../components/Feedback";
import {
  getProductAvailability,
  getProductWithChainPriceCents,
  isProductAvailable,
  money,
  getBasketQuantityForVariant,
  makeBasketItemId,
  useRecords,
  type Product,
  type Taxonomy,
} from "../../../data";
import {
  getProductStock,
  isNecklaceCategory,
} from "../../../data/productAvailability";
import { ProductGallery } from "./ProductVisuals";

export function ProductPage() {
  const { id } = useParams();
  const session = useContext(SessionContext);
  const products = useRecords<Product>("products");
  const categories = useRecords<Taxonomy>("categories");
  const { items, change } = useContext(BasketContext);
  const [selectedColorId, setSelectedColorId] = useState("");
  const [withChain, setWithChain] = useState(false);
  const product = products.data.find((p) => p.id === id);
  const colorVariants = product?.colorVariants || [];
  const hasColorChoices = colorVariants.length > 0;
  const selectedVariant = colorVariants.find(
    (variant) => variant.colorId === selectedColorId,
  );
  const selectedStock = hasColorChoices
    ? selectedVariant?.stock || 0
    : (product?.stock ?? 0);
  const basketItemId = product
    ? makeBasketItemId(
        product.id,
        hasColorChoices ? selectedColorId : "",
        withChain,
      )
    : "";
  const selectedBasketQuantity = basketItemId ? items[basketItemId] || 0 : 0;
  const basketQuantityForVariant = product
    ? getBasketQuantityForVariant(
        items,
        product.id,
        hasColorChoices ? selectedColorId : "",
      )
    : 0;
  const chainPriceCents = getProductWithChainPriceCents(product);
  const hasChainOption =
    isNecklaceCategory(
      categories.data.find((category) => category.id === product?.categoryId),
    ) && chainPriceCents !== undefined;
  const selectedPrice =
    withChain && hasChainOption ? chainPriceCents : (product?.priceCents ?? 0);

  useEffect(() => {
    setSelectedColorId("");
    setWithChain(false);
  }, [id]);

  useEffect(() => {
    if (!hasChainOption) setWithChain(false);
  }, [hasChainOption]);

  useEffect(() => {
    if (!hasColorChoices) {
      setSelectedColorId("");
      return;
    }
    setSelectedColorId((current) =>
      colorVariants.some((variant) => variant.colorId === current)
        ? current
        : colorVariants.find((variant) => variant.stock > 0)?.colorId ||
          colorVariants[0].colorId,
    );
  }, [product?.id, hasColorChoices, colorVariants]);
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
            <p className="price">
              {money(selectedPrice)}
              {hasChainOption && <small> · preço da opção selecionada</small>}
            </p>
            <p className="description">{product.description}</p>
            {hasColorChoices && (
              <fieldset className="product-variant-picker">
                <legend>Escolha a cor</legend>
                <div className="product-color-options">
                  {colorVariants.map((variant) => (
                    <button
                      type="button"
                      key={variant.colorId}
                      className={`product-color-option${selectedColorId === variant.colorId ? " is-selected" : ""}`}
                      aria-pressed={selectedColorId === variant.colorId}
                      onClick={() => setSelectedColorId(variant.colorId)}
                    >
                      <strong>{variant.colorName}</strong>
                      <small>
                        {variant.stock > 0
                          ? `Disponível · ${variant.stock} unidade(s)`
                          : "Esgotada"}
                      </small>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {hasChainOption && (
              <fieldset className="product-variant-picker">
                <legend>Como prefere receber?</legend>
                <label className="product-option-radio">
                  <input
                    type="radio"
                    name={`chain-option-${product.id}`}
                    checked={!withChain}
                    onChange={() => setWithChain(false)}
                  />
                  Somente o pingente{" "}
                  <strong>{money(product.priceCents)}</strong>
                </label>
                <label className="product-option-radio">
                  <input
                    type="radio"
                    name={`chain-option-${product.id}`}
                    checked={withChain}
                    onChange={() => setWithChain(true)}
                  />
                  Com corrente <strong>{money(chainPriceCents!)}</strong>
                </label>
              </fieldset>
            )}
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
            <p className="product-stock-summary">
              {availability[getProductAvailability(product)]} ·{" "}
              {getProductStock(product)} unidade(s) no total
            </p>
            {!session.admin && (
              <div className="product-actions">
                <button
                  className="button"
                  disabled={
                    !isProductAvailable(product) ||
                    selectedStock <= basketQuantityForVariant ||
                    (hasColorChoices && !selectedVariant) ||
                    (withChain && !hasChainOption)
                  }
                  onClick={() => change(basketItemId, 1)}
                >
                  Adicionar à sacola <ShoppingBag size={18} />
                </button>
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
              </div>
            )}
            {!session.admin && !!selectedBasketQuantity && (
              <p role="status">
                {selectedBasketQuantity} nesta opção na sacola.{" "}
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
