import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, MessageCircle, ShoppingBag } from "lucide-react";
import { BasketContext, SessionContext } from "../../../app/contexts";
import { availability } from "../../../app/constants";
import { Notice } from "../../../components/Feedback";
import {
  getProductAvailability,
  getProductTotalPriceCents,
  isProductAvailable,
  money,
  getBasketQuantityForVariant,
  makeBasketItemId,
  getStorefrontProduct,
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
  const lines = useRecords<Taxonomy>("collections");
  const colors = useRecords<Taxonomy>("colors");
  const { items, change } = useContext(BasketContext);
  const [selectedColorId, setSelectedColorId] = useState("");
  const productRecord = products.data.find((p) => p.id === id);
  const product = useMemo(
    () =>
      productRecord
        ? getStorefrontProduct(
            productRecord,
            categories.data,
            lines.data,
            colors.data,
          )
        : undefined,
    [productRecord, categories.data, lines.data, colors.data],
  );
  const colorVariants = product?.colorVariants || [];
  const hasColorChoices = colorVariants.length > 0;
  const selectedVariant = colorVariants.find(
    (variant) => variant.colorId === selectedColorId,
  );
  const selectedStock = hasColorChoices
    ? selectedVariant?.stock || 0
    : (product?.stock ?? 0);
  const basketItemId = product
    ? makeBasketItemId(product.id, hasColorChoices ? selectedColorId : "")
    : "";
  const selectedBasketQuantity = basketItemId ? items[basketItemId] || 0 : 0;
  const basketQuantityForVariant = product
    ? getBasketQuantityForVariant(
        items,
        product.id,
        hasColorChoices ? selectedColorId : "",
      )
    : 0;
  const necklace = isNecklaceCategory(
    categories.data.find((category) => category.id === product?.categoryId),
  );
  const selectedPrice = getProductTotalPriceCents(product, necklace);

  useEffect(() => {
    setSelectedColorId("");
  }, [id]);

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
              {necklace && <small> · corrente incluída</small>}
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
                      disabled={variant.stock <= 0}
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
                    (hasColorChoices && !selectedVariant)
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
              <div className="product-added-note" role="status">
                <span className="product-added-check" aria-hidden="true">
                  <Check size={18} />
                </span>
                <span className="product-added-copy">
                  <strong>
                    {selectedBasketQuantity === 1
                      ? "1 peça adicionada à sacola"
                      : `${selectedBasketQuantity} peças adicionadas à sacola`}
                  </strong>
                  {selectedVariant && (
                    <small>Cor escolhida: {selectedVariant.colorName}</small>
                  )}
                </span>
                <Link to="/carrinho">
                  Ver sacola <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        !products.loading &&
        !categories.loading &&
        !lines.loading &&
        !colors.loading &&
        !products.error && <h1>Peça não encontrada</h1>
      )}
    </div>
  );
}
