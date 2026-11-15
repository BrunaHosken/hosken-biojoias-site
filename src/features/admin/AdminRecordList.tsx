import { DEFAULT_LOW_STOCK_THRESHOLD, POLICY_TYPES } from "../../app/constants";
import { Notice } from "../../components/Feedback";
import type { Content, Product, Taxonomy } from "../../data";

export type AdminRecord = Product | Taxonomy | Content;

type AdminRecordListProps = {
  tab: string;
  records: { data: AdminRecord[]; loading: boolean; error: string };
  uploadingImages: boolean;
  onEdit: (record: AdminRecord) => void;
  onToggleProduct: (product: Product) => void;
  onToggleCollection: (collection: Taxonomy) => void;
  onRequestDelete: (record: AdminRecord) => void;
};

export function AdminRecordList({
  tab,
  records,
  uploadingImages,
  onEdit,
  onToggleProduct,
  onToggleCollection,
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
              {"stock" in record
                ? ` · Estoque: ${record.stock} · aviso em: ${record.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD}`
                : ""}
            </small>
            {"stock" in record &&
              (record.availability === "available" ||
                record.availability === "soldout") && (
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
                  onClick={() => onToggleProduct(record)}
                >
                  {record.status === "published" ? "Ocultar" : "Publicar"}
                </button>
              </>
            )}
            {tab === "collections" && "slug" in record && (
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
                  onClick={() => onToggleCollection(record)}
                >
                  {record.status === "published" ? "Ocultar" : "Publicar"}
                </button>
              </>
            )}
            {[
              "categories",
              "news",
              "events",
              "partnerStores",
              "policies",
            ].includes(tab) && (
              <button
                className="text-button"
                disabled={uploadingImages}
                onClick={() => onEdit(record)}
              >
                Editar
              </button>
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
