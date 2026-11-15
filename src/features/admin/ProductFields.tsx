import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import {
  availability,
  DEFAULT_LOW_STOCK_THRESHOLD,
  POLICY_TYPES,
} from "../../app/constants";
import { getProductImages } from "../storefront/productImages";
import type {
  Product,
  Taxonomy,
  EventScheduleEntry,
  Content,
} from "../../data";
import type { ProductDraft } from "./productModel";
import { availabilityFromStock } from "../../data/productAvailability";

type ProductFieldsProps = {
  product: ProductDraft;
  setProduct: Dispatch<SetStateAction<ProductDraft>>;
  lines: Taxonomy[];
  categories: Taxonomy[];
  uploadingImages: boolean;
  onUploadImages: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
};

export function AdminProductFields({
  product,
  setProduct,
  lines,
  categories,
  uploadingImages,
  onUploadImages,
  onRemoveImage,
}: ProductFieldsProps) {
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
      <div className="form-pair">
        <label>
          Preço (R$)
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
        <label>
          Estoque
          <input
            required
            type="number"
            min="0"
            step="1"
            value={product.stock}
            onChange={(e) => {
              const stock = Number(e.target.value);
              setProduct((current) => ({
                ...current,
                stock,
                availability:
                  current.availability === "available" ||
                  current.availability === "soldout"
                    ? availabilityFromStock(stock)
                    : current.availability,
              }));
            }}
          />
        </label>
      </div>
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
        Medidas (opcional)
        <input
          maxLength={300}
          value={product.dimensions || ""}
          onChange={(e) =>
            setProduct({ ...product, dimensions: e.target.value })
          }
          placeholder="Ex.: pingente com 3 cm"
        />
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
