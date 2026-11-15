import { useContext, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SessionContext } from "../../app/contexts";
import { useAdminConversations, useAdminOrders } from "../../data";
import { auth, localMode } from "../../firebase";
import {
  ADMIN_SEEN_CONVERSATIONS,
  markAdminNotificationSeen,
} from "../notifications/NotificationCenter";
import { AdminChatInbox } from "../chat/AdminChatInbox";
import { AdminContentManager } from "./AdminContentManager";
import { AdminProductManager } from "./AdminProductManager";
import type { AdminContentTab } from "./catalogTypes";
import { AdminOrders } from "./AdminOrders";
import { AdminReports } from "./Reports";

const moduleGroups = [
  {
    label: "Operação",
    items: [
      ["orders", "Pedidos"],
      ["chat", "Atendimento"],
    ],
  },
  {
    label: "Catálogo",
    items: [
      ["products", "Produtos"],
      ["categories", "Tipos de peça"],
      ["collections", "Linhas"],
    ],
  },
  {
    label: "Conteúdo",
    items: [
      ["news", "Novidades"],
      ["events", "Eventos"],
      ["partnerStores", "Lojas parceiras"],
      ["policies", "Políticas"],
    ],
  },
  {
    label: "Análise",
    items: [["reports", "Relatórios"]],
  },
];

const validTabs = moduleGroups.flatMap((group) =>
  group.items.map(([id]) => id),
);

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
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [catalogUploadBusy, setCatalogUploadBusy] = useState(false);
  const requestedTab = searchParams.get("tab");
  const tab =
    requestedTab && validTabs.includes(requestedTab) ? requestedTab : "orders";
  const conversations = useAdminConversations();
  const adminOrders = useAdminOrders();
  const unreadCount = conversations.data.reduce(
    (sum, conversation) => sum + (conversation.unreadForAdmin || 0),
    0,
  );

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

  function selectTab(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    if (id !== "chat") next.delete("conversation");
    if (id !== "orders") next.delete("order");
    setSearchParams(next);
    setCatalogVersion((version) => version + 1);
  }

  return (
    <div className="page">
      <div className="eyebrow">ÁREA RESTRITA</div>
      <h1>Cuidar do ateliê</h1>
      <p className="lead">
        Cadastros conectados ao {localMode ? "Firestore local" : "Firestore"} em
        tempo real.
      </p>
      <div className="admin-workspace">
        <nav className="admin-navigation" aria-label="Seções administrativas">
          {moduleGroups.map((group) => (
            <section className="admin-nav-group" key={group.label}>
              <h2>{group.label}</h2>
              <div className="admin-nav-items">
                {group.items.map(([id, label]) => (
                  <button
                    type="button"
                    className={`admin-nav-item ${tab === id ? "selected" : ""}`}
                    disabled={catalogUploadBusy}
                    aria-current={tab === id ? "page" : undefined}
                    onClick={() => selectTab(id)}
                    key={id}
                  >
                    <span>{label}</span>
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
            </section>
          ))}
        </nav>
        <div className="admin-content">
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
          ) : tab === "products" ? (
            <AdminProductManager
              key={`products-${catalogVersion}`}
              onImageUploadStateChange={setCatalogUploadBusy}
            />
          ) : (
            <AdminContentManager
              key={`${tab}-${catalogVersion}`}
              tab={tab as AdminContentTab}
            />
          )}
        </div>
      </div>
    </div>
  );
}
