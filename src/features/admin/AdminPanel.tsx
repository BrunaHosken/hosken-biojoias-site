import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { EventScheduleEntry } from "../../data";
import { Link, useSearchParams } from "react-router-dom";
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
  uploadBytes,
} from "firebase/storage";
import { Plus } from "lucide-react";
import { SessionContext, useToast } from "../../app/contexts";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../../app/constants";
import { ConfirmationModal } from "../../components/Feedback";
import { AdminChatInbox } from "../chat/AdminChatInbox";
import { AdminOrders } from "./AdminOrders";
import { AdminRecordList, type AdminRecord } from "./AdminRecordList";
import { AdminReports } from "./Reports";
import { blankProduct } from "./productModel";
import { AdminContentFields } from "./ContentFields";
import { AdminProductFields } from "./ProductFields";
import { getEventSchedule } from "../storefront/Pages";
import { getProductImages } from "../storefront/productImages";
import {
  ADMIN_SEEN_CONVERSATIONS,
  markAdminNotificationSeen,
} from "../notifications/NotificationCenter";
import { auth, db, localMode, storage } from "../../firebase";
import {
  useAdminOrders,
  useAdminConversations,
  useRecords,
  type Content,
  type Product,
  type Taxonomy,
} from "../../data";

export function Admin() {
  const session = useContext(SessionContext);
  if (!session.ready) return <div className="page">Verificando acesso…</div>;
  if (!session.user)
    return (
      <div className="page">
        <h1>Acesso administrativo</h1>
        <p>Entre com a conta autorizada para continuar.</p>
        <Link className="button" to="/conta">
          Entrar
        </Link>
      </div>
    );
  if (!session.admin)
    return (
      <div className="page">
        <h1>Acesso restrito</h1>
        <p>Sua conta não tem permissão para administrar a loja.</p>
      </div>
    );
  return <AdminPanel />;
}

export function AdminPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = [
    "orders",
    "reports",
    "chat",
    "products",
    "categories",
    "collections",
    "news",
    "events",
    "partnerStores",
    "policies",
  ];
  const requestedTab = searchParams.get("tab");
  const tab =
    requestedTab && validTabs.includes(requestedTab) ? requestedTab : "orders";
  const conversations = useAdminConversations();
  const adminOrders = useAdminOrders();
  const unreadCount = conversations.data.reduce(
    (sum, conversation) => sum + (conversation.unreadForAdmin || 0),
    0,
  );
  const products = useRecords<Product>("products", true);
  const cats = useRecords<Taxonomy>("categories", true);
  const lines = useRecords<Taxonomy>("collections", true);
  const content = useRecords<Content>(
    ["news", "events", "partnerStores", "policies"].includes(tab)
      ? tab
      : "news",
    true,
  );
  const [editing, setEditing] = useState("");
  const [product, setProduct] = useState(blankProduct);
  const [eventSchedule, setEventSchedule] = useState<EventScheduleEntry[]>([
    { date: "", time: "" },
  ]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const uploadedImagePaths = useRef(new Set<string>());
  const removedImagePaths = useRef(new Set<string>());
  const notify = useToast();
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    document.title = unreadCount
      ? `(${unreadCount}) Atendimento · Hosken Biojoias`
      : "Administração · Hosken Biojoias";
    const appNavigator = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unreadCount > 0) {
      appNavigator.setAppBadge?.(unreadCount).catch(() => {});
    } else {
      appNavigator.clearAppBadge?.().catch(() => {});
    }
    return () => {
      document.title = "Hosken Biojoias";
    };
  }, [unreadCount]);
  const tabs = [
    ["orders", "Pedidos"],
    ["reports", "Relatórios"],
    ["chat", "Atendimento"],
    ["products", "Produtos"],
    ["categories", "Tipos de peça"],
    ["collections", "Linhas"],
    ["news", "Novidades"],
    ["events", "Eventos"],
    ["partnerStores", "Lojas parceiras"],
    ["policies", "Políticas"],
  ];
  async function discardUnsavedProductImages() {
    const paths = Array.from(uploadedImagePaths.current);
    uploadedImagePaths.current.clear();
    await Promise.allSettled(
      paths.map((path) => deleteObject(storageRef(storage, path))),
    );
  }
  function removeProductImage(index: number) {
    const images = product.imageUrls || getProductImages(product);
    const paths = product.imagePaths || images.map(() => "");
    const removedPath = paths[index];
    if (removedPath) removedImagePaths.current.add(removedPath);
    setProduct({
      ...product,
      imageUrls: images.filter((_, imageIndex) => imageIndex !== index),
      imagePaths: paths.filter((_, imageIndex) => imageIndex !== index),
      imageUrl: "",
    });
  }
  async function uploadProductImages(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    if (getProductImages(product).length + files.length > 6) {
      notify("Cada produto pode ter até 6 fotos.", "warning");
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
    setUploadingImages(true);
    const uploaded: { path: string; url: string }[] = [];
    try {
      for (const file of files) {
        const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
        const path = `products/${user.uid}/${crypto.randomUUID()}-${fileName}`;
        const target = storageRef(storage, path);
        await uploadBytes(target, file, { contentType: file.type });
        uploaded.push({ path, url: "" });
        uploaded[uploaded.length - 1].url = await getDownloadURL(target);
      }
      uploaded.forEach(({ path }) => uploadedImagePaths.current.add(path));
      setProduct((current) => ({
        ...current,
        imageUrls: [
          ...getProductImages(current),
          ...uploaded.map(({ url }) => url),
        ],
        imagePaths: [
          ...(current.imagePaths || getProductImages(current).map(() => "")),
          ...uploaded.map(({ path }) => path),
        ],
        imageUrl: "",
      }));
      notify(
        "Fotos carregadas. Salve o produto para confirmar as alterações.",
        "success",
      );
    } catch {
      await Promise.allSettled(
        uploaded.map(({ path }) => deleteObject(storageRef(storage, path))),
      );
      notify(
        "Não foi possível enviar as fotos. Confira o Firebase Storage.",
        "error",
      );
    } finally {
      setUploadingImages(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const wasEditing = Boolean(editing);
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      if (tab === "products") {
        if (
          !Number.isSafeInteger(product.priceCents) ||
          product.priceCents < 0 ||
          !Number.isSafeInteger(product.stock) ||
          product.stock < 0 ||
          !Number.isSafeInteger(
            product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
          ) ||
          (product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD) < 0
        )
          throw new Error("invalid");
        const productToSave = {
          ...product,
          imageUrls: product.imageUrls || getProductImages(product),
          imagePaths: product.imagePaths || [],
          imageUrl: product.imageUrls?.[0] || product.imageUrl || "",
          lowStockThreshold:
            product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
        };
        if (editing)
          await updateDoc(doc(db, "products", editing), productToSave);
        else await addDoc(collection(db, "products"), productToSave);
        const removedPaths = Array.from(removedImagePaths.current);
        removedImagePaths.current.clear();
        await Promise.allSettled(
          removedPaths.map((path) => deleteObject(storageRef(storage, path))),
        );
        uploadedImagePaths.current.clear();
        setProduct(blankProduct);
        setEditing("");
      } else {
        const name = String(f.get("name")).trim();
        const isTaxonomy = ["categories", "collections"].includes(tab);
        const isEvent = tab === "events";
        const schedule = isEvent
          ? eventSchedule.filter((entry) => entry.date || entry.time)
          : [];
        if (
          isEvent &&
          (schedule.some((entry) => !entry.date) ||
            (f.get("status") === "published" && schedule.length === 0))
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
              status: String(f.get("status")),
              ...(tab === "collections"
                ? { description: String(f.get("description") || "").trim() }
                : {}),
            }
          : {
              title: name,
              body: String(f.get("body")).trim(),
              status: String(f.get("status")),
              ...(isEvent
                ? {
                    eventSchedule: schedule,
                    eventDate: schedule[0]?.date || "",
                    eventTime: schedule[0]?.time || "",
                    location: String(f.get("location") || "").trim(),
                    address: String(f.get("address") || "").trim(),
                    mapUrl: String(f.get("mapUrl") || "").trim(),
                  }
                : {}),
              ...(tab === "policies"
                ? { policyType: String(f.get("policyType") || "general") }
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
      }
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
  async function toggleProduct(p: Product) {
    try {
      await updateDoc(doc(db, "products", p.id), {
        status: p.status === "published" ? "draft" : "published",
      });
      notify("Visibilidade atualizada.", "success");
    } catch {
      notify("Não foi possível alterar a visibilidade.", "error");
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
    if (tab === "products") {
      void discardUnsavedProductImages();
      removedImagePaths.current.clear();
      const productRecord = record as Product;
      const { id, ...data } = productRecord;
      const imageUrls = data.imageUrls?.length
        ? data.imageUrls
        : data.imageUrl
          ? [data.imageUrl]
          : [];
      setProduct({
        ...blankProduct,
        ...data,
        imageUrls,
        imagePaths: data.imagePaths?.length
          ? data.imagePaths
          : imageUrls.map(() => ""),
        lowStockThreshold:
          data.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
      });
      setEditing(id);
      return;
    }
    if (tab === "collections") {
      setEditing(record.id);
      return;
    }
    setProduct(blankProduct);
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
  async function remove(id: string) {
    setDeleteBusy(true);
    try {
      const removedProduct =
        tab === "products"
          ? products.data.find((item) => item.id === id)
          : undefined;
      await deleteDoc(doc(db, tab, id));
      if (removedProduct?.imagePaths?.length) {
        await Promise.allSettled(
          removedProduct.imagePaths
            .filter(Boolean)
            .map((path) => deleteObject(storageRef(storage, path))),
        );
      }
      notify("Cadastro excluído.", "success");
      setPendingDelete(null);
    } catch {
      notify("Não foi possível excluir este cadastro.", "error");
    } finally {
      setDeleteBusy(false);
    }
  }
  const records =
    tab === "products"
      ? products
      : tab === "categories"
        ? cats
        : tab === "collections"
          ? lines
          : content;
  const editingLine =
    tab === "collections"
      ? lines.data.find((line) => line.id === editing)
      : undefined;
  const editingCategory =
    tab === "categories"
      ? cats.data.find((category) => category.id === editing)
      : undefined;
  const editingContent = [
    "news",
    "events",
    "partnerStores",
    "policies",
  ].includes(tab)
    ? content.data.find((record) => record.id === editing)
    : undefined;
  return (
    <div className="page">
      <div className="eyebrow">ÁREA RESTRITA</div>
      <h1>Cuidar do ateliê</h1>
      <p className="lead">
        Cadastros conectados ao {localMode ? "Firestore local" : "Firestore"} em
        tempo real.
      </p>
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button
            className={tab === id ? "selected" : ""}
            disabled={uploadingImages}
            onClick={() => {
              void discardUnsavedProductImages();
              removedImagePaths.current.clear();
              setEventSchedule(id === "events" ? [{ date: "", time: "" }] : []);
              const next = new URLSearchParams(searchParams);
              next.set("tab", id);
              if (id !== "chat") next.delete("conversation");
              if (id !== "orders") next.delete("order");
              setSearchParams(next);
              setEditing("");
              setProduct(blankProduct);
            }}
            key={id}
          >
            {label}
            {id === "chat" && unreadCount > 0 && (
              <span
                className="unread-badge"
                aria-label={`${unreadCount} mensagens não lidas`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab === "orders" ? (
        <AdminOrders
          orders={adminOrders}
          focusOrderId={searchParams.get("order") || ""}
        />
      ) : tab === "chat" ? (
        <AdminChatInbox
          conversations={conversations.data}
          loading={conversations.loading}
          error={conversations.error}
          unreadCount={unreadCount}
          adminId={auth.currentUser?.uid || ""}
          selectedConversationId={searchParams.get("conversation") || ""}
          onSelectConversation={(id) => {
            const next = new URLSearchParams(searchParams);
            next.set("tab", "chat");
            next.set("conversation", id);
            next.delete("order");
            setSearchParams(next);
            markAdminNotificationSeen(ADMIN_SEEN_CONVERSATIONS, id);
          }}
        />
      ) : tab === "reports" ? (
        <AdminReports />
      ) : (
        <div className="admin-layout">
          <form
            key={`${tab}-${editing}`}
            className="admin-form"
            onSubmit={save}
          >
            <h2>
              {editing
                ? tab === "products"
                  ? "Editar peça"
                  : tab === "categories"
                    ? "Editar tipo de peça"
                    : tab === "collections"
                      ? "Editar linha"
                      : "Editar conteúdo"
                : "Novo cadastro"}
            </h2>
            {tab === "products" ? (
              <AdminProductFields
                product={product}
                setProduct={setProduct}
                lines={lines.data}
                categories={cats.data}
                uploadingImages={uploadingImages}
                onUploadImages={uploadProductImages}
                onRemoveImage={removeProductImage}
              />
            ) : (
              <AdminContentFields
                tab={tab}
                editingCategory={editingCategory}
                editingLine={editingLine}
                editingContent={editingContent}
                eventSchedule={eventSchedule}
                setEventSchedule={setEventSchedule}
              />
            )}
            <button className="button" disabled={busy || uploadingImages}>
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
                disabled={uploadingImages}
                onClick={() => {
                  void discardUnsavedProductImages();
                  removedImagePaths.current.clear();
                  setEditing("");
                  setProduct(blankProduct);
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
            uploadingImages={uploadingImages}
            onEdit={editRecord}
            onToggleProduct={toggleProduct}
            onToggleCollection={toggleCollection}
            onRequestDelete={requestDelete}
          />
        </div>
      )}
      {pendingDelete && (
        <ConfirmationModal
          title="Excluir cadastro?"
          message={`Tem certeza que deseja excluir “${pendingDelete.label}”? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          busy={deleteBusy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void remove(pendingDelete.id)}
        />
      )}
    </div>
  );
}
