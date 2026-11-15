import { useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Plus } from "lucide-react";
import type { EventScheduleEntry } from "../../data";
import { useToast } from "../../app/contexts";
import { ConfirmationModal } from "../../components/Feedback";
import { useRecords, type Content, type Taxonomy } from "../../data";
import { db } from "../../firebase";
import { getEventSchedule } from "../storefront/eventSchedule";
import { AdminRecordList, type AdminRecord } from "./AdminRecordList";
import { AdminContentFields } from "./ContentFields";
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
  const notify = useToast();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const wasEditing = Boolean(editing);
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const name = String(fields.get("name")).trim();
      const isTaxonomy = ["categories", "collections"].includes(tab);
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

  async function toggleCollection(line: Taxonomy) {
    try {
      await updateDoc(doc(db, "collections", line.id), {
        status: line.status === "published" ? "draft" : "published",
      });
      notify(
        line.status === "published"
          ? "Linha ocultada da vitrine."
          : "Linha publicada na vitrine.",
        "success",
      );
    } catch {
      notify("Não foi possível alterar a publicação da linha.", "error");
    }
  }

  function editRecord(record: AdminRecord) {
    if (tab === "collections") {
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
  const editingContent = !["categories", "collections"].includes(tab)
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
                : "Editar conteúdo"
            : "Novo cadastro"}
        </h2>
        <AdminContentFields
          tab={tab}
          editingCategory={editingCategory}
          editingLine={editingLine}
          editingContent={editingContent}
          eventSchedule={eventSchedule}
          setEventSchedule={setEventSchedule}
        />
        <button className="button" disabled={busy}>
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
            onClick={() => {
              setEditing("");
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
        uploadingImages={false}
        onEdit={editRecord}
        onToggleCollection={toggleCollection}
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
