import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
} from "firebase/storage";
import { Plus } from "lucide-react";
import type { EventScheduleEntry } from "../../data";
import { useToast } from "../../app/contexts";
import { ConfirmationModal } from "../../components/Feedback";
import { useRecords, type Content, type Taxonomy } from "../../data";
import { auth, db, storage } from "../../firebase";
import { convertToWebp } from "../../utils/convertToWebp";
import { uploadFile } from "../../utils/uploadFile";
import { getEventSchedule } from "../storefront/eventSchedule";
import { AdminRecordList, type AdminRecord } from "./AdminRecordList";
import { AdminContentFields, type LineImage } from "./ContentFields";
import type { AdminContentTab } from "./catalogTypes";

export function AdminContentManager({ tab }: { tab: AdminContentTab }) {
  const records = useRecords<Content | Taxonomy>(tab, true);
  const [editing, setEditing] = useState("");
  const [eventSchedule, setEventSchedule] = useState<EventScheduleEntry[]>([
    { date: "", time: "" },
  ]);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lineImages, setLineImages] = useState<LineImage[]>([]);
  const [lineImagesUploading, setLineImagesUploading] = useState(false);
  const uploadedLinePaths = useRef(new Set<string>());
  const removedLinePaths = useRef(new Set<string>());
  const mounted = useRef(true);
  const notify = useToast();

  async function discardUnsavedLineImages() {
    const paths = Array.from(uploadedLinePaths.current);
    uploadedLinePaths.current.clear();
    await Promise.allSettled(
      paths.map((path) => deleteObject(storageRef(storage, path))),
    );
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void discardUnsavedLineImages();
    };
  }, []);

  async function uploadLineImages(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    if (lineImages.length + files.length > 6) {
      notify("Cada linha pode ter até 6 fotos.", "warning");
      return;
    }
    if (
      files.some(
        (file) =>
          !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024,
      )
    ) {
      notify("Escolha imagens de até 10 MB cada.", "warning");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      notify("Entre com a conta administradora para enviar fotos.", "error");
      return;
    }

    setLineImagesUploading(true);
    const uploaded: LineImage[] = [];
    const uploadedPaths: string[] = [];
    try {
      for (const file of files) {
        const webp = await convertToWebp(file);
        if (webp.size > 10 * 1024 * 1024)
          throw new Error("webp-file-too-large");
        const path = `collections/${user.uid}/${crypto.randomUUID()}.webp`;
        const target = storageRef(storage, path);
        await uploadFile(target, webp, { contentType: "image/webp" });
        uploadedLinePaths.current.add(path);
        uploadedPaths.push(path);
        uploaded.push({ path, url: await getDownloadURL(target) });
      }
      if (!mounted.current) {
        await Promise.allSettled(
          uploadedPaths.map((path) => deleteObject(storageRef(storage, path))),
        );
        uploadedPaths.forEach((path) => uploadedLinePaths.current.delete(path));
        return;
      }
      setLineImages((current) => [...current, ...uploaded]);
      notify(
        "Fotos convertidas para WebP. Salve a linha para confirmar as alterações.",
        "success",
      );
    } catch (cause) {
      await Promise.allSettled(
        uploadedPaths.map(async (path) => {
          uploadedLinePaths.current.delete(path);
          await deleteObject(storageRef(storage, path));
        }),
      );
      if (mounted.current)
        notify(
          cause instanceof Error && cause.message === "webp-file-too-large"
            ? "Uma foto convertida passou de 10 MB. Escolha uma imagem menor."
            : cause instanceof Error && cause.message === "file-upload-timeout"
              ? "O envio demorou demais e foi cancelado. Confira sua conexão e tente novamente."
              : cause instanceof Error &&
                  cause.message === "webp-encoding-unsupported"
                ? "Este navegador não conseguiu converter a foto para WebP. Tente outro navegador."
                : "Não foi possível enviar as fotos. Você pode continuar usando o painel; confira sua conexão e o Firebase Storage.",
          "error",
        );
    } finally {
      if (mounted.current) setLineImagesUploading(false);
    }
  }

  function removeLineImage(index: number) {
    const removed = lineImages[index];
    if (removed?.path && !uploadedLinePaths.current.has(removed.path))
      removedLinePaths.current.add(removed.path);
    setLineImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index),
    );
  }

  async function removeUnretainedLineImages() {
    const retainedPaths = new Set(
      lineImages.map((image) => image.path).filter(Boolean),
    );
    const pathsToDelete = new Set([
      ...removedLinePaths.current,
      ...Array.from(uploadedLinePaths.current).filter(
        (path) => !retainedPaths.has(path),
      ),
    ]);
    await Promise.allSettled(
      Array.from(pathsToDelete).map((path) =>
        deleteObject(storageRef(storage, path)),
      ),
    );
    uploadedLinePaths.current.clear();
    removedLinePaths.current.clear();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const wasEditing = Boolean(editing);
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const name = String(fields.get("name")).trim();
      const isTaxonomy = ["categories", "collections", "colors"].includes(tab);
      const isEvent = tab === "events";
      const schedule = isEvent
        ? eventSchedule.filter((entry) => entry.date || entry.time)
        : [];
      if (
        isEvent &&
        (schedule.some((entry) => !entry.date) ||
          (fields.get("status") === "published" && schedule.length === 0))
      )
        throw new Error("eventSchedule");

      const payload = isTaxonomy
        ? {
            name,
            slug: name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
            status: String(fields.get("status")),
            ...(tab === "collections"
              ? {
                  description: String(fields.get("description") || "").trim(),
                  imageUrls: lineImages.map((image) => image.url),
                  imagePaths: lineImages.map((image) => image.path),
                }
              : {}),
          }
        : {
            title: name,
            body: String(fields.get("body")).trim(),
            status: String(fields.get("status")),
            ...(isEvent
              ? {
                  eventSchedule: schedule,
                  eventDate: schedule[0]?.date || "",
                  eventTime: schedule[0]?.time || "",
                  location: String(fields.get("location") || "").trim(),
                  address: String(fields.get("address") || "").trim(),
                  mapUrl: String(fields.get("mapUrl") || "").trim(),
                }
              : {}),
            ...(tab === "policies"
              ? {
                  policyType: String(fields.get("policyType") || "general"),
                }
              : {}),
          };

      if (editing) {
        await updateDoc(doc(db, tab, editing), payload);
        setEditing("");
      } else {
        await addDoc(collection(db, tab), payload);
      }
      if (tab === "collections") {
        await removeUnretainedLineImages();
        setLineImages([]);
      }
      form.reset();
      if (isEvent) setEventSchedule([{ date: "", time: "" }]);
      notify(
        wasEditing ? "Alterações salvas." : "Cadastro criado com sucesso.",
        "success",
      );
    } catch (error) {
      notify(
        error instanceof Error && error.message === "eventSchedule"
          ? "Preencha a data de cada horário. Eventos publicados precisam ter pelo menos uma data."
          : "Não foi possível salvar. Confira os campos, sua permissão e a conexão com o banco.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleTaxonomy(record: Taxonomy) {
    const label =
      tab === "colors"
        ? "Cor"
        : tab === "categories"
          ? "Tipo de peça"
          : "Linha";
    try {
      await updateDoc(doc(db, tab, record.id), {
        status: record.status === "published" ? "draft" : "published",
      });
      notify(
        record.status === "published"
          ? `${label} ocultada.`
          : `${label} publicada.`,
        "success",
      );
    } catch {
      notify(
        `Não foi possível alterar a publicação de ${label.toLowerCase()}.`,
        "error",
      );
    }
  }

  function editRecord(record: AdminRecord) {
    if (tab === "collections") {
      void discardUnsavedLineImages();
      removedLinePaths.current.clear();
      const line = record as Taxonomy;
      setLineImages(
        (line.imageUrls || []).map((url, index) => ({
          url,
          path: line.imagePaths?.[index] || "",
        })),
      );
      setEditing(record.id);
      return;
    }
    if (tab === "events") {
      const schedule = getEventSchedule(record as Content);
      setEventSchedule(schedule.length ? schedule : [{ date: "", time: "" }]);
    }
    setEditing(record.id);
  }

  function requestDelete(record: AdminRecord) {
    setPendingDelete({
      id: record.id,
      label: "name" in record ? record.name : record.title,
    });
  }

  async function removeRecord(id: string) {
    setDeleteBusy(true);
    try {
      await deleteDoc(doc(db, tab, id));
      notify("Cadastro excluído.", "success");
      setPendingDelete(null);
    } catch {
      notify("Não foi possível excluir este cadastro.", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  const editingRecord = records.data.find((record) => record.id === editing);
  const editingLine =
    tab === "collections" ? (editingRecord as Taxonomy | undefined) : undefined;
  const editingCategory =
    tab === "categories" ? (editingRecord as Taxonomy | undefined) : undefined;
  const editingColor =
    tab === "colors" ? (editingRecord as Taxonomy | undefined) : undefined;
  const editingContent = !["categories", "collections", "colors"].includes(tab)
    ? (editingRecord as Content | undefined)
    : undefined;

  return (
    <div className="admin-layout">
      <form key={`${tab}-${editing}`} className="admin-form" onSubmit={save}>
        <h2>
          {editing
            ? tab === "categories"
              ? "Editar tipo de peça"
              : tab === "collections"
                ? "Editar linha"
                : tab === "colors"
                  ? "Editar cor"
                  : "Editar conteúdo"
            : "Novo cadastro"}
        </h2>
        <AdminContentFields
          tab={tab}
          editingCategory={editingCategory}
          editingLine={editingLine}
          editingColor={editingColor}
          editingContent={editingContent}
          eventSchedule={eventSchedule}
          setEventSchedule={setEventSchedule}
          lineImages={lineImages}
          lineImagesUploading={lineImagesUploading || busy}
          onUploadLineImages={uploadLineImages}
          onRemoveLineImage={removeLineImage}
        />
        <button className="button" disabled={busy || lineImagesUploading}>
          {busy
            ? "Salvando…"
            : editing
              ? "Salvar alterações"
              : "Salvar cadastro"}{" "}
          <Plus size={17} />
        </button>
        {editing && (
          <button
            type="button"
            className="text-button"
            disabled={busy || lineImagesUploading}
            onClick={() => {
              setEditing("");
              if (tab === "collections") {
                void discardUnsavedLineImages();
                removedLinePaths.current.clear();
                setLineImages([]);
              }
              setEventSchedule(
                tab === "events" ? [{ date: "", time: "" }] : [],
              );
            }}
          >
            Cancelar edição
          </button>
        )}
      </form>
      <AdminRecordList
        tab={tab}
        records={records}
        uploadingImages={lineImagesUploading}
        onEdit={editRecord}
        onToggleTaxonomy={toggleTaxonomy}
        onRequestDelete={requestDelete}
      />
      {pendingDelete && (
        <ConfirmationModal
          title="Excluir cadastro?"
          message={`Tem certeza que deseja excluir “${pendingDelete.label}”? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          busy={deleteBusy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void removeRecord(pendingDelete.id)}
        />
      )}
    </div>
  );
}
