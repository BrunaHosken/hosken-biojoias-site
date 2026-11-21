import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ImagePlus, MessageCircle, Send, X } from "lucide-react";
import { SessionContext, useToast } from "../../app/contexts";
import { ConfirmationModal } from "../../components/Feedback";
import { ImageLightbox } from "../../components/ImageLightbox";
import { auth, localMode } from "../../firebase";
import {
  ChatStartFlow,
  chatTopicDraft,
  type ChatIntakeTopic,
} from "./ChatStartFlow";
import {
  closeConversation,
  createCustomerConversation,
  startCustomerConversation,
  useCustomerConversation,
  useConversationMessages,
  useConversationQuotes,
  sendChatMessage,
  markConversationRead,
  editChatMessage,
  deleteChatMessage,
  type ChatConversation,
  type ChatMessage,
} from "../../data";
import { CustomQuoteCard } from "./CustomQuoteCard";
import { CustomQuoteComposer } from "./CustomQuoteComposer";

const MAX_CHAT_IMAGE_BYTES = 10 * 1024 * 1024;

function useImagePreview(file: File | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

function validateChatImage(file: File) {
  if (!file.type.startsWith("image/")) return "Escolha um arquivo de imagem.";
  if (file.size > MAX_CHAT_IMAGE_BYTES)
    return "A imagem precisa ter até 10 MB antes do envio.";
  return "";
}

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
  const checkoutReturn = searchParams.get("voltar") === "checkout";
  const returnCustomQuoteId = searchParams.get("customQuote") || "";
  const returnConversationId = searchParams.get("conversation") || "";
  const quoteReturn = Boolean(returnCustomQuoteId && returnConversationId);
  const checkoutReturnPath =
    returnCustomQuoteId && returnConversationId
      ? `/checkout?customQuote=${encodeURIComponent(returnCustomQuoteId)}&conversation=${encodeURIComponent(returnConversationId)}`
      : "/checkout";
  const customOrderRequest = searchParams.get("encomenda") === "personalizada";
  const productContext = productId && productName ? productName : "";
  const contextTopic: ChatIntakeTopic | null = quoteReturn
    ? "custom"
    : checkoutReturn
      ? "pickup"
      : customOrderRequest
        ? "custom"
        : productContext
          ? "product"
          : null;
  const [helpTopic, setHelpTopic] = useState<ChatIntakeTopic | null>(
    contextTopic,
  );
  const [intakeStarted, setIntakeStarted] = useState(Boolean(contextTopic));
  const [directContextActive, setDirectContextActive] = useState(
    Boolean(contextTopic),
  );
  const [conversationEndedHere, setConversationEndedHere] = useState(false);
  const initialDraft = directContextActive
    ? quoteReturn
      ? ""
      : productContext
        ? `Olá! Tenho uma dúvida sobre a peça ${productContext}.`
        : customOrderRequest
          ? "Olá! Gostaria de encomendar uma peça personalizada. Vou explicar a ideia por aqui."
          : checkoutReturn
            ? "Olá! Quero combinar uma retirada presencial para um pedido que estou finalizando."
            : ""
    : intakeStarted && helpTopic
      ? chatTopicDraft(helpTopic)
      : "";
  const chatPath = searchParams.size
    ? `/chat?${searchParams.toString()}`
    : "/chat";
  const chat = useCustomerConversation(session.user?.uid);
  const openConversationId = useRef("");
  useEffect(() => {
    const current = chat.conversation;
    if (!current) return;
    if (current.status === "open") {
      openConversationId.current = current.id;
    } else if (
      current.status === "closed" &&
      openConversationId.current === current.id
    ) {
      openConversationId.current = "";
      setConversationEndedHere(true);
      setIntakeStarted(false);
      setHelpTopic(null);
      setDirectContextActive(false);
      attemptedUsers.current.clear();
    }
  }, [chat.conversation?.id, chat.conversation?.status]);
  const hasConversationActivity = Boolean(
    chat.conversation?.lastMessageId || chat.conversation?.lastMessage,
  );
  const showIntake = Boolean(
    !session.admin &&
    !chat.loading &&
    chat.serverReady &&
    !chat.error &&
    (!chat.conversation ||
      chat.conversation.status === "closed" ||
      !hasConversationActivity) &&
    !intakeStarted,
  );
  const attemptedUsers = useRef(new Set<string>());
  const requestTopic = directContextActive ? contextTopic : helpTopic;
  useEffect(() => {
    const user = session.user;
    if (
      !session.ready ||
      !user ||
      session.admin ||
      chat.loading ||
      !chat.serverReady ||
      chat.error ||
      !intakeStarted ||
      (chat.conversation
        ? !requestTopic ||
          attemptedUsers.current.has(
            `request:${chat.conversation.id}:${requestTopic}`,
          )
        : attemptedUsers.current.has(`create:${user.uid}`))
    )
      return;
    const attemptKey = chat.conversation
      ? `request:${chat.conversation.id}:${requestTopic}`
      : `create:${user.uid}`;
    attemptedUsers.current.add(attemptKey);
    const startRequest = chat.conversation
      ? startCustomerConversation(chat.conversation.id, requestTopic!)
      : createCustomerConversation(
          user.uid,
          user.displayName || "Cliente",
          user.email || "",
          requestTopic || "other",
        );
    startRequest.catch((cause) => {
      if (import.meta.env.DEV)
        console.error("Customer conversation creation failed", cause);
      attemptedUsers.current.delete(attemptKey);
      setIntakeStarted(false);
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
    chat.serverReady,
    chat.error,
    chat.conversation,
    helpTopic,
    contextTopic,
    requestTopic,
    directContextActive,
    intakeStarted,
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
        {chat.conversation?.status === "open" && hasConversationActivity
          ? "Acompanhe sua conversa com a artesã por aqui."
          : "Escolha um assunto. Talvez já exista uma resposta pronta; se precisar, você pode conversar com a artesã."}
      </p>
      {conversationEndedHere && (
        <section className="chat-start chat-start-ended" aria-live="polite">
          <MessageCircle size={28} />
          <h2>Conversa encerrada</h2>
          <p>Obrigada por falar com o ateliê.</p>
        </section>
      )}
      {directContextActive && (checkoutReturn || quoteReturn) && (
        <div className="chat-checkout-return">
          <p>
            {quoteReturn
              ? "Você pode continuar a conversa sobre sua proposta ou voltar ao checkout quando quiser."
              : "Depois de combinar a retirada com a artesã, volte ao checkout e marque a confirmação para continuar."}
          </p>
          <Link className="button secondary" to={checkoutReturnPath}>
            Voltar ao checkout <ArrowRight size={17} />
          </Link>
        </div>
      )}
      {helpTopic === "pickup" &&
        !(directContextActive && checkoutReturn) && (
        <div className="chat-checkout-return">
          <p>
            O assunto desta conversa já está definido como retirada presencial.
            Conte para a artesã quando e onde prefere combinar.
          </p>
        </div>
      )}
      {helpTopic === "custom" && !(directContextActive && quoteReturn) && (
        <div className="chat-custom-order-context">
          <strong>Encomenda personalizada</strong>
          <p>
            Conte o que você imaginou e, se ajudar, envie uma foto de
            referência. A artesã conversa com você e prepara uma proposta com
            tipo da peça, cores e valores.
          </p>
        </div>
      )}
      {helpTopic === "product" && productContext && (
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
      {showIntake && (
        <ChatStartFlow
          onStart={(topic) => {
            setConversationEndedHere(false);
            setDirectContextActive(false);
            setHelpTopic(topic);
            setIntakeStarted(true);
          }}
        />
      )}
      {!chat.loading &&
        !chat.error &&
        (!chat.conversation || chat.conversation.status === "closed") &&
        intakeStarted && (
          <section className="chat-start" role="status">
            <MessageCircle size={28} />
            <h2>Abrindo sua conversa…</h2>
            <p>Estamos preparando o atendimento com a Hosken Biojoias.</p>
          </section>
        )}
      {chat.conversation &&
        chat.conversation.status === "open" &&
        !showIntake && (
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
  const quotes = useConversationQuotes(conversationId);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [now, setNow] = useState(Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrl = useImagePreview(imageFile);
  const timelineItems = [
    ...messages.data.map((message, index) => ({
      type: "message" as const,
      timestamp: message.createdAt?.toMillis() ?? 0,
      message,
      previousMessage: messages.data[index - 1],
    })),
    ...quotes.data.map((quote) => ({
      type: "quote" as const,
      timestamp: quote.createdAt?.toMillis() ?? 0,
      quote,
    })),
  ].sort((first, second) => first.timestamp - second.timestamp);
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
  }, [messages.data.length, quotes.data.length]);
  useEffect(() => {
    if (unreadCount > 0) {
      markConversationRead(conversationId, senderRole).catch(() =>
        setSendError("Não foi possível atualizar as mensagens lidas."),
      );
    }
  }, [conversationId, senderRole, unreadCount]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim() && !imageFile) return;
    setBusy(true);
    setSendError("");
    try {
      await sendChatMessage(
        conversationId,
        senderId,
        senderRole,
        text,
        imageFile || undefined,
      );
      setNow(Date.now());
      setText("");
      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
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
        cause instanceof Error && cause.message === "chat-image-too-large"
          ? "A imagem ficou maior que 10 MB mesmo convertida. Escolha uma imagem menor."
          : cause instanceof Error && cause.message === "file-upload-timeout"
            ? "O envio da imagem demorou demais e foi cancelado. Confira sua conexão e tente novamente."
            : imageFile
              ? "Não foi possível enviar a imagem. Você pode continuar usando o chat; confira a conexão e se o Firebase Storage está configurado."
              : localMode
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
        {senderRole === "admin" && conversation.status === "open" && (
          <button
            type="button"
            className="chat-close-button"
            onClick={() =>
              closeConversation(conversationId).catch(() =>
                setSendError("Não foi possível encerrar o atendimento."),
              )
            }
          >
            <X size={16} /> Encerrar conversa
          </button>
        )}
      </header>
      <div className="chat-messages" ref={listRef} aria-live="polite">
        {(messages.loading || quotes.loading) && (
          <p className="muted">Carregando mensagens…</p>
        )}
        {messages.error && (
          <p className="notice" role="alert">
            {messages.error}
          </p>
        )}
        {quotes.error && (
          <p className="notice" role="alert">
            {quotes.error}
          </p>
        )}
        {!messages.loading &&
          !quotes.loading &&
          !messages.error &&
          timelineItems.length === 0 && (
            <p className="chat-empty">Envie uma mensagem para começar.</p>
          )}
        {timelineItems.map((item) =>
          item.type === "message" ? (
            <ChatMessageBubble
              key={item.message.id}
              conversation={conversation}
              message={item.message}
              own={item.message.senderId === senderId}
              isLatest={item.message.id === conversation.lastMessageId}
              previousMessage={item.previousMessage}
              now={now}
            />
          ) : (
            <CustomQuoteCard
              key={item.quote.id}
              quote={item.quote}
              conversationId={conversationId}
              customerId={conversation.customerId}
              isAdmin={senderRole === "admin"}
            />
          ),
        )}
      </div>
      {conversation.status === "closed" && (
        <p className="chat-closed-notice" role="status">
          Atendimento encerrado. A cliente verá os assuntos disponíveis quando
          abrir o chat novamente.
        </p>
      )}
      {senderRole === "admin" && conversation.status === "open" && (
        <CustomQuoteComposer
          conversationId={conversationId}
          adminId={senderId}
        />
      )}
      {conversation.status === "open" && (
        <form className="chat-composer" onSubmit={submit}>
          <input
            ref={imageInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              const validation = validateChatImage(file);
              if (validation) {
                setSendError(validation);
                event.currentTarget.value = "";
                return;
              }
              event.currentTarget.value = "";
              setSendError("");
              setImageFile(file);
            }}
          />
          <label className="sr-only" htmlFor={`message-${conversationId}`}>
            Escreva sua mensagem
          </label>
          <div className="chat-composer-main">
            <textarea
              id={`message-${conversationId}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Escreva sua mensagem…"
            />
            <div className="chat-composer-actions">
              <button
                className="chat-attach-button"
                type="button"
                onClick={() => imageInputRef.current?.click()}
                aria-label="Anexar imagem"
                title="Anexar imagem"
              >
                <ImagePlus size={19} />
              </button>
              <button
                className="button"
                disabled={busy || (!text.trim() && !imageFile)}
                aria-label="Enviar mensagem"
              >
                <span>{busy ? "Enviando…" : "Enviar"}</span>
                <Send size={17} />
              </button>
            </div>
          </div>
          {imageFile && (
            <div className="chat-image-selection">
              <img src={imagePreviewUrl} alt="Prévia da imagem anexada" />
              <span>{imageFile.name} · será enviada em WebP</span>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setImageFile(null);
                  if (imageInputRef.current) imageInputRef.current.value = "";
                }}
              >
                Remover
              </button>
            </div>
          )}
        </form>
      )}
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
  const [replacementImage, setReplacementImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const replacementPreviewUrl = useImagePreview(replacementImage);
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
      await editChatMessage(
        conversation.id,
        message,
        editText,
        replacementImage || undefined,
      );
      setEditing(false);
      setReplacementImage(null);
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
          <input
            ref={editImageInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              const validation = validateChatImage(file);
              if (validation) {
                notify(validation, "error");
                event.currentTarget.value = "";
                return;
              }
              event.currentTarget.value = "";
              setReplacementImage(file);
            }}
          />
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={2000}
            autoFocus
            aria-label="Editar mensagem"
          />
          {(replacementImage || message.imageUrl) && (
            <img
              className="chat-edit-image-preview"
              src={replacementPreviewUrl || message.imageUrl}
              alt={replacementImage ? "Prévia da nova imagem" : "Imagem atual"}
            />
          )}
          <div>
            <button
              className="text-button"
              type="button"
              onClick={() => editImageInputRef.current?.click()}
            >
              {message.imageUrl ? "Trocar imagem" : "Adicionar imagem"}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setEditing(false);
                setReplacementImage(null);
              }}
            >
              Cancelar
            </button>
            <button
              className="text-button"
              type="submit"
              disabled={
                busy ||
                (!editText.trim() && !replacementImage && !message.imageUrl)
              }
            >
              Salvar
            </button>
          </div>
        </form>
      ) : (
        <>
          {message.imageUrl && (
            <button
              className="chat-image-link"
              type="button"
              onClick={() => setLightboxImage(message.imageUrl || "")}
              aria-label="Ampliar imagem enviada na conversa"
            >
              <img src={message.imageUrl} alt="Imagem enviada na conversa" />
            </button>
          )}
          {message.text && <p>{message.text}</p>}
        </>
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
          message="A conversa continuará salva, mas esta mensagem e a imagem anexada serão removidas."
          confirmLabel="Excluir mensagem"
          busy={busy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void remove()}
        />
      )}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt="Imagem enviada na conversa"
          onClose={() => setLightboxImage("")}
        />
      )}
    </article>
  );
}
