import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { ChatThread } from "./CustomerChat";
import type { ChatConversation } from "../../data";

export function AdminChatInbox({
  conversations,
  loading,
  error,
  unreadCount,
  adminId,
  selectedConversationId,
  onSelectConversation,
}: {
  conversations: ChatConversation[];
  loading: boolean;
  error: string;
  unreadCount: number;
  adminId: string;
  selectedConversationId: string;
  onSelectConversation: (id: string) => void;
}) {
  const [showConversations, setShowConversations] = useState(false);
  const selected =
    conversations.find((item) => item.id === selectedConversationId) ||
    conversations[0];
  return (
    <section className="admin-inbox">
      <div className="admin-inbox-heading">
        <div>
          <h2>Atendimentos</h2>
          <p className="muted">Mensagens atualizadas em tempo real.</p>
        </div>
        {unreadCount > 0 && (
          <span className="unread-summary">
            {unreadCount} não lida{unreadCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando atendimentos…</p>
      ) : conversations.length === 0 ? (
        <div className="empty">
          <MessageCircle />
          <h2>Nenhum atendimento ainda.</h2>
          <p>As conversas iniciadas pelos clientes aparecerão aqui.</p>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={`mobile-conversation-toggle${showConversations ? " is-open" : ""}`}
            aria-expanded={showConversations}
            aria-controls="admin-conversation-list"
            onClick={() => setShowConversations((open) => !open)}
          >
            <span>Conversas ({conversations.length})</span>
            <ChevronDown size={17} aria-hidden="true" />
          </button>
          <div
            className={`admin-inbox-layout${showConversations ? " show-conversations" : ""}`}
          >
            <nav
              className="conversation-list"
              id="admin-conversation-list"
              aria-label="Lista de atendimentos"
            >
              {conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  className={`conversation-preview ${selected?.id === conversation.id ? "selected" : ""}`}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    setShowConversations(false);
                  }}
                >
                  <span className="conversation-preview-top">
                    <strong>{conversation.customerName || "Cliente"}</strong>
                    {!!conversation.unreadForAdmin && (
                      <span className="unread-badge">
                        {conversation.unreadForAdmin > 99
                          ? "99+"
                          : conversation.unreadForAdmin}
                      </span>
                    )}
                  </span>
                  <small>{conversation.customerEmail}</small>
                  <span className="conversation-preview-last">
                    {conversation.lastMessage || "Conversa iniciada"}
                  </span>
                </button>
              ))}
            </nav>
            {selected && (
              <ChatThread
                key={selected.id}
                conversation={selected}
                senderId={adminId}
                senderRole="admin"
                otherPartyName={
                  selected.customerName || selected.customerEmail || "Cliente"
                }
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}
