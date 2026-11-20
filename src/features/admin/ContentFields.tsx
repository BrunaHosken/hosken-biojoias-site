import {
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ImagePlus, Plus } from "lucide-react";
import { POLICY_TYPES } from "../../app/constants";
import type { Content, EventScheduleEntry, Taxonomy } from "../../data";
import { ImageLightbox } from "../../components/ImageLightbox";

export type LineImage = { url: string; path: string };

export function AdminContentFields({
  tab,
  editingCategory,
  editingLine,
  editingColor,
  editingContent,
  eventSchedule,
  setEventSchedule,
  lineImages,
  lineImagesUploading,
  onUploadLineImages,
  onRemoveLineImage,
}: {
  tab: string;
  editingCategory?: Taxonomy;
  editingLine?: Taxonomy;
  editingColor?: Taxonomy;
  editingContent?: Content;
  eventSchedule: EventScheduleEntry[];
  setEventSchedule: Dispatch<SetStateAction<EventScheduleEntry[]>>;
  lineImages: LineImage[];
  lineImagesUploading: boolean;
  onUploadLineImages: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveLineImage: (index: number) => void;
}) {
  const [lightboxImage, setLightboxImage] = useState("");
  return (
    <>
      <label>
        {["categories", "collections", "colors"].includes(tab)
          ? "Nome"
          : "Título"}
        <input
          name="name"
          required
          defaultValue={
            editingCategory?.name ||
            editingLine?.name ||
            editingColor?.name ||
            editingContent?.title ||
            ""
          }
          maxLength={
            ["categories", "collections", "colors"].includes(tab) ? 80 : 160
          }
        />
      </label>
      {tab === "collections" && (
        <>
          <label>
            Descrição curta para a vitrine (opcional)
            <textarea
              name="description"
              maxLength={220}
              defaultValue={editingLine?.description || ""}
            />
          </label>
          <div className="admin-line-images">
            <span className="admin-field-label">Fotos da linha</span>
            <label className="button secondary admin-image-upload-button">
              <ImagePlus size={17} />
              {lineImagesUploading ? "Carregando fotos…" : "Adicionar fotos"}
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                disabled={lineImagesUploading}
                onChange={onUploadLineImages}
              />
            </label>
            <small className="field-hint">
              Até 6 fotos. PNG, JPEG e outros formatos de imagem são convertidos
              para WebP.
            </small>
            {lineImages.length > 0 && (
              <div className="admin-line-image-grid">
                {lineImages.map((image, index) => (
                  <figure key={image.path || image.url}>
                    <button
                      className="admin-image-lightbox-trigger"
                      type="button"
                      aria-label={`Ampliar foto ${index + 1} da linha`}
                      onClick={() => setLightboxImage(image.url)}
                    >
                      <img src={image.url} alt={`Foto ${index + 1} da linha`} />
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={lineImagesUploading}
                      onClick={() => onRemoveLineImage(index)}
                    >
                      Remover
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </div>
          {lightboxImage && (
            <ImageLightbox
              src={lightboxImage}
              alt="Foto da linha"
              onClose={() => setLightboxImage("")}
            />
          )}
        </>
      )}
      {!["categories", "collections", "colors"].includes(tab) && (
        <label>
          {tab === "policies" ? "Texto da política" : "Texto"}
          <textarea
            name="body"
            required
            maxLength={tab === "policies" ? 12000 : 5000}
            defaultValue={editingContent?.body || ""}
            placeholder={
              tab === "policies"
                ? "Insira o texto revisado pelo ateliê."
                : undefined
            }
          />
          {tab === "policies" && (
            <small className="field-hint">
              Cadastre cada assunto em um item separado e publique quando
              estiver pronto.
            </small>
          )}
        </label>
      )}
      {tab === "events" && (
        <>
          <div className="event-schedule-editor">
            <div className="event-schedule-heading">
              <span>Data</span>
              <span>Horário</span>
              <span>Ação</span>
            </div>
            {eventSchedule.map((entry, index) => (
              <div className="event-schedule-row" key={index}>
                <input
                  type="date"
                  aria-label={`Data do horário ${index + 1}`}
                  value={entry.date}
                  onChange={(e) =>
                    setEventSchedule((current) =>
                      current.map((item, rowIndex) =>
                        rowIndex === index
                          ? { ...item, date: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  type="time"
                  aria-label={`Horário da data ${index + 1}`}
                  value={entry.time}
                  onChange={(e) =>
                    setEventSchedule((current) =>
                      current.map((item, rowIndex) =>
                        rowIndex === index
                          ? { ...item, time: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <button
                  className="text-button event-schedule-remove"
                  type="button"
                  aria-label={`Remover data ${index + 1}`}
                  onClick={() =>
                    setEventSchedule((current) =>
                      current.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
          <div className="event-schedule-footer">
            <button
              className="button secondary event-schedule-add"
              type="button"
              disabled={eventSchedule.length >= 30}
              onClick={() =>
                setEventSchedule((current) => [
                  ...current,
                  { date: "", time: "" },
                ])
              }
            >
              <Plus size={16} /> Adicionar data
            </button>
          </div>
          <small className="field-hint event-schedule-hint">
            Adicione uma linha para cada dia ou sessão. O horário é opcional.
          </small>
          <label>
            Local
            <input
              name="location"
              maxLength={160}
              defaultValue={editingContent?.location || ""}
            />
          </label>
          <label>
            Endereço
            <input
              name="address"
              maxLength={300}
              defaultValue={editingContent?.address || ""}
            />
          </label>
          <label>
            Link para abrir a rota (opcional)
            <input
              type="url"
              name="mapUrl"
              maxLength={2000}
              defaultValue={editingContent?.mapUrl || ""}
              placeholder="https://…"
            />
          </label>
        </>
      )}
      {tab === "partnerStores" && (
        <>
          <label>
            Tipo de local
            <select
              name="partnerType"
              required
              defaultValue={editingContent?.partnerType || "partner_store"}
            >
              <option value="partner_store">Loja parceira</option>
              <option value="physical_store">Loja física</option>
            </select>
          </label>
          <label>
            Local
            <input
              name="location"
              maxLength={160}
              defaultValue={editingContent?.location || ""}
            />
          </label>
          <label>
            Endereço
            <input
              name="address"
              maxLength={300}
              required
              defaultValue={editingContent?.address || ""}
            />
          </label>
          <label>
            Link para abrir a rota (opcional)
            <input
              type="url"
              name="mapUrl"
              maxLength={2000}
              defaultValue={editingContent?.mapUrl || ""}
              placeholder="https://…"
            />
          </label>
        </>
      )}
      {tab === "policies" && (
        <label>
          Tipo de política
          <select
            name="policyType"
            defaultValue={editingContent?.policyType || "general"}
          >
            {POLICY_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Publicação
        <select
          name="status"
          defaultValue={
            editingCategory?.status ||
            editingLine?.status ||
            editingColor?.status ||
            editingContent?.status ||
            "draft"
          }
        >
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
        </select>
      </label>
    </>
  );
}
