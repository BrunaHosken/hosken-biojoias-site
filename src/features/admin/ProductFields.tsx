import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import {
  availability,
  DEFAULT_LOW_STOCK_THRESHOLD,
  POLICY_TYPES,
} from "../../app/constants";
import { getProductImages } from "../storefront/productImages";
import type {
  Product,
  ProductColorVariant,
  Taxonomy,
  EventScheduleEntry,
  Content,
} from "../../data";
import type { ProductDraft } from "./productModel";
import {
  availabilityFromStock,
  getProductStock,
} from "../../data/productAvailability";

type ProductFieldsProps = {
  product: ProductDraft;
  setProduct: Dispatch<SetStateAction<ProductDraft>>;
  lines: Taxonomy[];
  categories: Taxonomy[];
  colors: Taxonomy[];
  uploadingImages: boolean;
  onUploadImages: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
};

export function AdminProductFields({
  product,
  setProduct,
  lines,
  categories,
  colors,
  uploadingImages,
  onUploadImages,
  onRemoveImage,
}: ProductFieldsProps) {
  const productColors = colors.filter(
    (color) =>
      color.status === "published" ||
      product.colorVariants?.some((variant) => variant.colorId === color.id),
  );
  for (const variant of product.colorVariants || []) {
    if (!productColors.some((color) => color.id === variant.colorId)) {
      productColors.push({
        id: variant.colorId,
        name: variant.colorName,
        slug: variant.colorId,
        status: "published",
      });
    }
  }

  function updateColorVariants(colorVariants: ProductColorVariant[]) {
    const stock = colorVariants.reduce(
      (total, variant) => total + variant.stock,
      0,
    );
    setProduct((current) => ({
      ...current,
      colorVariants,
      stock,
      availability:
        current.availability === "available" ||
        current.availability === "soldout"
          ? availabilityFromStock(stock)
          : current.availability,
    }));
  }

  return (
    <>
      <label>
        Nome
        <input
          required
          maxLength={120}
          value={product.name}
          onChange={(e) => setProduct({ ...product, name: e.target.value })}
        />
      </label>
      <label>
        Descrição
        <textarea
          required
          maxLength={3000}
          value={product.description}
          onChange={(e) =>
            setProduct({ ...product, description: e.target.value })
          }
        />
      </label>
      <label>
        Preço da peça sem corrente (R$)
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={product.priceCents / 100}
          onChange={(e) =>
            setProduct({
              ...product,
              priceCents: Math.round(Number(e.target.value) * 100),
            })
          }
        />
      </label>
      <fieldset className="admin-variant-fields">
        <legend>Opção de corrente</legend>
        <p className="field-hint">
          Disponível para peças vendidas como pingente. O adicional é somado ao
          preço da peça; o estoque continua sendo controlado por cor.
        </p>
        <label className="admin-color-choice">
          <input
            type="checkbox"
            checked={product.chainAddonPriceCents !== undefined}
            onChange={(event) =>
              setProduct((current) => ({
                ...current,
                chainAddonPriceCents: event.target.checked
                  ? (current.chainAddonPriceCents ?? 0)
                  : undefined,
                withChainPriceCents: undefined,
              }))
            }
          />
          <span>Oferecer também a opção com corrente</span>
        </label>
        {product.chainAddonPriceCents !== undefined && (
          <label>
            Adicional da corrente (R$)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={product.chainAddonPriceCents / 100}
              onChange={(event) =>
                setProduct((current) => ({
                  ...current,
                  chainAddonPriceCents: Math.round(
                    Number(event.target.value) * 100,
                  ),
                }))
              }
            />
          </label>
        )}
      </fieldset>
      <fieldset className="admin-variant-fields">
        <legend>Cores e estoque por cor</legend>
        <p className="field-hint">
          Cadastre as cores na seção Catálogo → Cores e marque aqui as opções
          desta peça. A disponibilidade geral soma o estoque de todas as cores.
        </p>
        {productColors.length ? (
          <div className="admin-color-stock-list">
            {productColors.map((color) => {
              const variant = product.colorVariants?.find(
                (item) => item.colorId === color.id,
              );
              return (
                <div className="admin-color-stock-row" key={color.id}>
                  <label className="admin-color-choice">
                    <input
                      type="checkbox"
                      checked={Boolean(variant)}
                      disabled={color.status !== "published" && !variant}
                      onChange={(event) => {
                        const current = product.colorVariants || [];
                        const next = event.target.checked
                          ? [
                              ...current,
                              {
                                colorId: color.id,
                                colorName: color.name,
                                stock: 0,
                              },
                            ]
                          : current.filter((item) => item.colorId !== color.id);
                        updateColorVariants(next);
                      }}
                    />
                    <span>{color.name}</span>
                  </label>
                  {variant ? (
                    <label className="admin-color-stock-input">
                      Estoque
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={variant.stock}
                        onChange={(event) =>
                          updateColorVariants(
                            (product.colorVariants || []).map((item) =>
                              item.colorId === color.id
                                ? {
                                    ...item,
                                    colorName: color.name,
                                    stock: Number(event.target.value),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  ) : (
                    <span className="muted">Não oferecida</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">
            Publique uma cor em Catálogo → Cores antes de configurar variantes.
          </p>
        )}
        <label className="admin-total-stock-field">
          Estoque total da peça
          <input
            type="number"
            value={getProductStock(product)}
            readOnly
            aria-readonly="true"
          />
          <small className="field-hint">
            Total informativo calculado pelas quantidades das cores
            selecionadas.
          </small>
        </label>
      </fieldset>
      <label>
        Avisar quando o estoque chegar a
        <input
          required
          type="number"
          min="0"
          max="10000"
          step="1"
          value={product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD}
          onChange={(e) =>
            setProduct({
              ...product,
              lowStockThreshold: Number(e.target.value),
            })
          }
        />
        <small className="field-hint">
          O sino avisará quando restarem essa quantidade ou menos.
        </small>
      </label>
      <label>
        Linha
        <select
          required
          value={product.collectionId}
          onChange={(e) =>
            setProduct({ ...product, collectionId: e.target.value })
          }
        >
          <option value="">Selecione</option>
          {lines.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tipo de peça
        <select
          required
          value={product.categoryId}
          onChange={(e) =>
            setProduct({ ...product, categoryId: e.target.value })
          }
        >
          <option value="">Selecione</option>
          {categories.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Disponibilidade
        <select
          value={
            product.availability === "available" ||
            product.availability === "soldout"
              ? "automatic"
              : product.availability
          }
          onChange={(e) => {
            const value = e.target.value;
            setProduct((current) => ({
              ...current,
              availability:
                value === "automatic"
                  ? availabilityFromStock(current.stock)
                  : value,
            }));
          }}
        >
          <option value="automatic">
            Automática pelo estoque (
            {availability[availabilityFromStock(product.stock)]})
          </option>
          <option value="paused">Indisponível (pausar vendas)</option>
          <option value="prelaunch">Em breve</option>
          <option value="made-to-order">Sob encomenda</option>
        </select>
        <small className="field-hint">
          No modo automático, estoque acima de zero fica disponível e estoque
          zerado fica esgotado. Você também pode pausar vendas sem alterar a
          quantidade física.
        </small>
      </label>
      <label>
        Fotos da peça
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploadingImages || getProductImages(product).length >= 6}
          onChange={(e) => void onUploadImages(e)}
        />
        <small className="field-hint">
          Envie até 6 imagens, com no máximo 10 MB cada.
          {uploadingImages ? " Enviando fotos…" : ""}
        </small>
      </label>
      {getProductImages(product).length > 0 && (
        <div className="admin-product-images" aria-label="Fotos cadastradas">
          {getProductImages(product).map((image, index) => (
            <div className="admin-product-image" key={`${image}-${index}`}>
              <img
                src={image}
                alt={`Foto ${index + 1} de ${product.name || "produto"}`}
              />
              <button
                type="button"
                className="text-button"
                disabled={uploadingImages}
                onClick={() => onRemoveImage(index)}
              >
                Remover foto
              </button>
            </div>
          ))}
        </div>
      )}
      <label>
        Materiais (opcional)
        <input
          maxLength={500}
          value={product.materials || ""}
          onChange={(e) =>
            setProduct({ ...product, materials: e.target.value })
          }
          placeholder="Ex.: orquídea natural, resina e metal"
        />
      </label>
      <label>
        Medidas da joia (opcional)
        <input
          maxLength={300}
          value={product.dimensions || ""}
          onChange={(e) =>
            setProduct({ ...product, dimensions: e.target.value })
          }
          placeholder="Ex.: pingente com 3 cm"
        />
        <small className="field-hint">
          Este texto aparece na página do produto.
        </small>
      </label>
      <label>
        Cuidados com a peça (opcional)
        <textarea
          maxLength={1500}
          value={product.careInstructions || ""}
          onChange={(e) =>
            setProduct({ ...product, careInstructions: e.target.value })
          }
        />
      </label>
      <fieldset className="product-shipping-fields">
        <legend>Dados internos para frete</legend>
        <p className="field-hint">
          Usados para calcular o envio. Não aparecem na página da loja.
        </p>
        <div className="form-pair">
          <label>
            Comprimento da embalagem (cm)
            <input
              required
              type="number"
              min="0.1"
              step="0.1"
              value={product.packageLengthCm ?? ""}
              onChange={(e) =>
                setProduct((current) => ({
                  ...current,
                  packageLengthCm: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
            />
          </label>
          <label>
            Largura da embalagem (cm)
            <input
              required
              type="number"
              min="0.1"
              step="0.1"
              value={product.packageWidthCm ?? ""}
              onChange={(e) =>
                setProduct((current) => ({
                  ...current,
                  packageWidthCm: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
            />
          </label>
        </div>
        <div className="form-pair">
          <label>
            Altura da embalagem (cm)
            <input
              required
              type="number"
              min="0.1"
              step="0.1"
              value={product.packageHeightCm ?? ""}
              onChange={(e) =>
                setProduct((current) => ({
                  ...current,
                  packageHeightCm: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
            />
          </label>
          <label>
            Peso da embalagem (g)
            <input
              required
              type="number"
              min="1"
              step="1"
              value={product.packageWeightGrams ?? ""}
              onChange={(e) =>
                setProduct((current) => ({
                  ...current,
                  packageWeightGrams: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
            />
          </label>
        </div>
        <label>
          Peso da joia (g, opcional)
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={product.pieceWeightGrams ?? ""}
            onChange={(e) =>
              setProduct((current) => ({
                ...current,
                pieceWeightGrams: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              }))
            }
          />
        </label>
      </fieldset>
      <label>
        Publicação
        <select
          value={product.status}
          onChange={(e) => setProduct({ ...product, status: e.target.value })}
        >
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
        </select>
      </label>
    </>
  );
}
