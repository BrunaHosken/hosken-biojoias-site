import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, MessageCircle, Send } from "lucide-react";
import { SessionContext, useToast } from "../../app/contexts";
import { ConfirmationModal } from "../../components/Feedback";
import { auth, localMode } from "../../firebase";
import {
  createCustomerConversation,
  useCustomerConversation,
  useConversationMessages,
  sendChatMessage,
  markConversationRead,
  editChatMessage,
  deleteChatMessage,
  type ChatConversation,
  type ChatMessage,
} from "../../data";

export function CustomerChat() {
  const session = useContext(SessionContext);
  const notify = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("produto") || "";
  const productName = (searchParams.get("nome") || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
  const productContext = productId && productName ? productName : "";
  const initialDraft = productContext
    ? `Olá! Tenho uma dúvida sobre a peça ${productContext}.`
    : "";
  const chatPath = searchParams.size
    ? `/chat?${searchParams.toString()}`
    : "/chat";
  const chat = useCustomerConversation(session.user?.uid);
  const attemptedUsers = useRef(new Set<string>());
  useEffect(() => {
    const user = session.user;
    if (
      !session.ready ||
      !user ||
      session.admin ||
      chat.loading ||
      chat.error ||
      chat.conversation ||
      attemptedUsers.current.has(user.uid)
    )
      return;
    attemptedUsers.current.add(user.uid);
    createCustomerConversation(
      user.uid,
      user.displayName || "Cliente",
      user.email || "",
    ).catch(() => {
      notify(
        "Não foi possível abrir o chat. Recarregue a página para tentar novamente.",
        "error",
      );
    });
  }, [
    session.ready,
    session.user,
    session.admin,
    chat.loading,
    chat.error,
    chat.conversation,
    notify,
  ]);
  if (!session.ready) return <div className="page">Carregando sua conta…</div>;
  if (!session.user)
    return (
      <div className="page narrow">
        <div className="eyebrow">ATENDIMENTO HOSKEN BIOJOIAS</div>
        <h1>Fale com o ateliê</h1>
        <p className="lead">Entre na sua conta para iniciar uma conversa.</p>
        <Link
          className="button"
          to={`/conta?returnTo=${encodeURIComponent(chatPath)}`}
        >
          Entrar ou criar conta <ArrowRight size={18} />
        </Link>
      </div>
    );
  if (session.admin)
    return (
      <div className="page narrow">
        <div className="eyebrow">ATENDIMENTO HOSKEN BIOJOIAS</div>
        <h1>Caixa de atendimento</h1>
        <p className="lead">Acesse as conversas pelo painel administrativo.</p>
        <Link className="button" to="/admin">
          Abrir administração <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <div className="page chat-page">
      <button
        className="chat-back-button"
        type="button"
        onClick={() => {
          const historyIndex = window.history.state?.idx;
          if (typeof historyIndex === "number" && historyIndex > 0) {
            navigate(-1);
          } else {
            navigate(
              productId ? `/produto/${encodeURIComponent(productId)}` : "/loja",
            );
          }
        }}
      >
        ← Voltar
      </button>
      <div className="eyebrow">ATENDIMENTO HOSKEN BIOJOIAS</div>
      <h1>Fale com o ateliê</h1>
      <p className="lead">
        Envie sua mensagem. Nossa equipe responderá por aqui.
      </p>
      {productContext && (
        <div className="chat-product-context">
          <span className="eyebrow">PEÇA EM FOCO</span>
          <Link to={`/produto/${encodeURIComponent(productId)}`}>
            {productContext} <ArrowRight size={16} />
          </Link>
          <small>
            Deixamos uma mensagem sobre esta peça pronta para você revisar.
          </small>
        </div>
      )}
      {chat.loading && <p role="status">Carregando conversa…</p>}
      {chat.error && (
        <p className="notice" role="alert">
          {chat.error}
        </p>
      )}
      {!chat.loading && !chat.error && !chat.conversation && (
        <section className="chat-start" role="status">
          <MessageCircle size={28} />
          <h2>Abrindo sua conversa…</h2>
          <p>Estamos preparando o atendimento com a Hosken Biojoias.</p>
        </section>
      )}
      {chat.conversation && (
        <ChatThread
          conversation={chat.conversation}
          senderId={session.user.uid}
          senderRole="customer"
          otherPartyName="Hosken Biojoias"
          initialDraft={initialDraft}
        />
      )}
    </div>
  );
}
export function ChatThread({
  conversation,
  senderId,
  senderRole,
  otherPartyName,
  initialDraft = "",
}: {
  conversation: ChatConversation;
  senderId: string;
  senderRole: ChatMessage["senderRole"];
  otherPartyName: string;
  initialDraft?: string;
}) {
  const conversationId = conversation.id;
  const unreadCount =
    senderRole === "admin"
      ? conversation.unreadForAdmin
      : conversation.unreadForCustomer;
  const messages = useConversationMessages(conversationId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [now, setNow] = useState(Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (initialDraft) {
      setText((current) => (current.trim() ? current : initialDraft));
    }
  }, [initialDraft]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.data.length]);
  useEffect(() => {
    if (unreadCount > 0) {
      markConversationRead(conversationId, senderRole).catch(() =>
        setSendError("Não foi possível atualizar as mensagens lidas."),
      );
    }
  }, [conversationId, senderRole, unreadCount]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setSendError("");
    try {
      await sendChatMessage(conversationId, senderId, senderRole, text);
      setNow(Date.now());
      setText("");
    } catch (cause) {
      const code =
        typeof cause === "object" && cause !== null && "code" in cause
          ? String(cause.code)
          : "erro desconhecido";
      const currentUser = auth.currentUser;
      let adminClaim = "indisponível";
      try {
        adminClaim =
          (await currentUser?.getIdTokenResult())?.claims.admin === true
            ? "sim"
            : "não";
      } catch {
        /* A falha original continua sendo exibida abaixo. */
      }
      const matchesAuth = currentUser?.uid === senderId;
      const matchesConversationPath = conversation.id === senderId;
      const matchesConversationOwner = conversation.customerId === senderId;
      const validUnreadCounters =
        Number.isInteger(conversation.unreadForAdmin) &&
        Number.isInteger(conversation.unreadForCustomer);
      if (import.meta.env.DEV) {
        console.error("Chat message send failed", {
          code,
          matchesAuth,
          matchesConversationPath,
          matchesConversationOwner,
          validUnreadCounters,
          unreadForAdmin: conversation.unreadForAdmin,
          unreadForCustomer: conversation.unreadForCustomer,
          senderRole,
          messageLength: text.trim().length,
          adminClaim,
          projectId: auth.app.options.projectId,
        });
      }
      setSendError(
        localMode
          ? `Não foi possível enviar (${code}). Diagnóstico: conta ${matchesAuth ? "ok" : "divergente"}, caminho ${matchesConversationPath ? "ok" : "divergente"}, cliente da conversa ${matchesConversationOwner ? "ok" : "divergente"}, não lidas equipe/cliente ${conversation.unreadForAdmin}/${conversation.unreadForCustomer}, papel ${senderRole}, ${text.trim().length} caracteres, claim admin ${adminClaim}, projeto ${auth.app.options.projectId}.`
          : "Não foi possível enviar a mensagem. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="chat-thread"
      aria-label={`Conversa com ${otherPartyName}`}
    >
      <header className="chat-thread-header">
        <span className="chat-avatar">
          <MessageCircle size={20} />
        </span>
        <div>
          <strong>{otherPartyName}</strong>
          <small>Atendimento Hosken Biojoias</small>
        </div>
      </header>
      <div className="chat-messages" ref={listRef} aria-live="polite">
        {messages.loading && <p className="muted">Carregando mensagens…</p>}
        {messages.error && (
          <p className="notice" role="alert">
            {messages.error}
          </p>
        )}
        {!messages.loading && !messages.error && messages.data.length === 0 && (
          <p className="chat-empty">Envie uma mensagem para começar.</p>
        )}
        {messages.data.map((item, index) => (
          <ChatMessageBubble
            key={item.id}
            conversation={conversation}
            message={item}
            own={item.senderId === senderId}
            isLatest={item.id === conversation.lastMessageId}
            previousMessage={messages.data[index - 1]}
            now={now}
          />
        ))}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor={`message-${conversationId}`}>
          Escreva sua mensagem
        </label>
        <textarea
          id={`message-${conversationId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Escreva sua mensagem…"
        />
        <button
          className="button"
          disabled={busy || !text.trim()}
          aria-label="Enviar mensagem"
        >
          <span>{busy ? "Enviando…" : "Enviar"}</span>
          <Send size={17} />
        </button>
      </form>
      {sendError && (
        <p className="notice" role="alert">
          {sendError}
        </p>
      )}
    </section>
  );
}
function ChatMessageBubble({
  conversation,
  message,
  own,
  isLatest,
  previousMessage,
  now,
}: {
  conversation: ChatConversation;
  message: ChatMessage;
  own: boolean;
  isLatest: boolean;
  previousMessage?: ChatMessage;
  now: number;
}) {
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const date = message.createdAt?.toDate();
  const withinEditWindow = Boolean(
    date &&
    now + 2000 >= date.getTime() &&
    now - date.getTime() < 60 * 60 * 1000,
  );
  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await editChatMessage(conversation.id, message, editText);
      setEditing(false);
      notify("Mensagem editada.", "success");
    } catch (cause) {
      if (import.meta.env.DEV) {
        console.error("Falha ao editar mensagem", cause);
      }
      const code =
        typeof cause === "object" && cause !== null && "code" in cause
          ? String(cause.code)
          : "";
      notify(
        code === "permission-denied"
          ? "O Firebase recusou a edição. Atualize a conversa e tente novamente."
          : "Não foi possível editar a mensagem. Verifique a conexão e tente novamente.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await deleteChatMessage(
        conversation,
        message,
        isLatest ? previousMessage : undefined,
      );
      setConfirmDelete(false);
      notify("Mensagem excluída.", "success");
    } catch {
      notify("Não foi possível excluir. O prazo pode ter expirado.", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={`chat-message ${own ? "own" : ""}`}>
      {editing ? (
        <form className="chat-edit-form" onSubmit={saveEdit}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={2000}
            autoFocus
            aria-label="Editar mensagem"
          />
          <div>
            <button
              className="text-button"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
            <button
              className="text-button"
              type="submit"
              disabled={busy || !editText.trim()}
            >
              Salvar
            </button>
          </div>
        </form>
      ) : (
        <p>{message.text}</p>
      )}
      <small>
        {own ? "Você" : message.senderRole === "admin" ? "Ateliê" : "Cliente"}
        {date &&
          ` · ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)}`}
        {message.editedAt && " · editada"}
      </small>
      {!editing && withinEditWindow && own && (
        <div className="chat-message-actions">
          <button
            type="button"
            onClick={() => {
              setEditText(message.text);
              setEditing(true);
            }}
            disabled={busy}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            Excluir
          </button>
        </div>
      )}
      {confirmDelete && (
        <ConfirmationModal
          title="Excluir mensagem?"
          message="A conversa continuará salva, mas esta mensagem será removida."
          confirmLabel="Excluir mensagem"
          busy={busy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void remove()}
        />
      )}
    </article>
  );
}
