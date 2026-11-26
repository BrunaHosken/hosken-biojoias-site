import {
  availability,
  DEFAULT_LOW_STOCK_THRESHOLD,
  POLICY_TYPES,
} from "../../app/constants";
import { Notice } from "../../components/Feedback";
import {
  getProductAvailability,
  type Content,
  type Product,
  type Taxonomy,
} from "../../data";

export type AdminRecord = Product | Taxonomy | Content;

type AdminRecordListProps = {
  tab: string;
  records: { data: AdminRecord[]; loading: boolean; error: string };
  uploadingImages: boolean;
  onEdit: (record: AdminRecord) => void;
  onToggleProduct?: (product: Product) => void;
  onToggleTaxonomy?: (taxonomy: Taxonomy) => void;
  onToggleContent?: (content: Content) => void;
  onRequestDelete: (record: AdminRecord) => void;
};

export function AdminRecordList({
  tab,
  records,
  uploadingImages,
  onEdit,
  onToggleProduct,
  onToggleTaxonomy,
  onToggleContent,
  onRequestDelete,
}: AdminRecordListProps) {
  return (
    <section>
      <h2>Cadastros existentes</h2>
      <Notice {...records} />
      {records.data.map((record) => (
        <article className="admin-row" key={record.id}>
          <div>
            <strong>{"name" in record ? record.name : record.title}</strong>
            <small>
              {record.status === "published" ? "Publicado" : "Rascunho"}
              {"policyType" in record
                ? ` · ${POLICY_TYPES.find((type) => type.id === record.policyType)?.label || "Geral"}`
                : ""}
              {"category" in record && record.category
                ? ` · ${record.category}`
                : ""}
              {"stock" in record
                ? ` · Estoque: ${record.stock} · aviso em: ${record.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD} · Disponibilidade: ${availability[getProductAvailability(record)]}`
                : ""}
            </small>
            {"stock" in record &&
              (record.availability === "available" ||
                record.availability === "soldout" ||
                record.availability === "paused") && (
                <span
                  className={`admin-stock-badge ${
                    record.stock === 0
                      ? "admin-stock-empty"
                      : record.stock <=
                          (record.lowStockThreshold ??
                            DEFAULT_LOW_STOCK_THRESHOLD)
                        ? "admin-stock-low"
                        : "admin-stock-ok"
                  }`}
                >
                  {record.stock === 0
                    ? "Estoque vazio"
                    : record.stock <=
                        (record.lowStockThreshold ??
                          DEFAULT_LOW_STOCK_THRESHOLD)
                      ? "Estoque baixo"
                      : "Em estoque"}
                </span>
              )}
          </div>
          <div>
            {tab === "products" && "stock" in record && (
              <>
                <button
                  className="text-button"
                  disabled={uploadingImages}
                  onClick={() => onEdit(record)}
                >
                  Editar
                </button>
                <button
                  className="text-button"
                  disabled={uploadingImages}
                  onClick={() => onToggleProduct?.(record)}
                >
                  {record.status === "published" ? "Ocultar" : "Publicar"}
                </button>
              </>
            )}
            {["categories", "collections", "colors"].includes(tab) &&
              "slug" in record && (
                <>
                  <button
                    className="text-button"
                    disabled={uploadingImages}
                    onClick={() => onEdit(record)}
                  >
                    Editar
                  </button>
                  <button
                    className="text-button"
                    disabled={uploadingImages}
                    onClick={() => onToggleTaxonomy?.(record)}
                  >
                    {record.status === "published" ? "Ocultar" : "Publicar"}
                  </button>
                </>
              )}
            {["news", "events", "partnerStores", "policies", "faqs"].includes(tab) && (
              "title" in record && (
                <>
                  <button
                    className="text-button"
                    disabled={uploadingImages}
                    onClick={() => onEdit(record)}
                  >
                    Editar
                  </button>
                  <button
                    className="text-button"
                    disabled={uploadingImages}
                    onClick={() => onToggleContent?.(record)}
                  >
                    {record.status === "published" ? "Ocultar" : "Publicar"}
                  </button>
                </>
              )
            )}
            <button
              className="text-button"
              disabled={uploadingImages}
              onClick={() => onRequestDelete(record)}
            >
              Excluir
            </button>
          </div>
        </article>
      ))}
      {!records.loading && !records.data.length && (
        <p className="muted">Nenhum cadastro ainda.</p>
      )}
    </section>
  );
}
