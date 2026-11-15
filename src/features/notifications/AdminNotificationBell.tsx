import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  MessageCircle,
  ShoppingBag,
  X,
} from "lucide-react";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../../app/constants";
import {
  useAdminConversations,
  useAdminOrders,
  useRecords,
  type ChatConversation,
  type CustomerOrder,
  type Product,
} from "../../data";
import {
  markAdminNotificationSeen,
  readAdminSeenIds,
  ADMIN_NOTIFICATIONS_EVENT,
  ADMIN_SEEN_CONVERSATIONS,
  ADMIN_SEEN_ORDERS,
} from "./notificationStorage";
import { useDismissNotificationOnOutside } from "./useDismissNotificationOnOutside";

function AdminNotificationBell({
  orders,
  conversations,
  products,
}: {
  orders: CustomerOrder[];
  conversations: ChatConversation[];
  products: Product[];
}) {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  useDismissNotificationOnOutside(bellRef, open, setOpen);
  const [seenOrders, setSeenOrders] = useState(() =>
    readAdminSeenIds(ADMIN_SEEN_ORDERS),
  );
  const [seenConversations, setSeenConversations] = useState(() =>
    readAdminSeenIds(ADMIN_SEEN_CONVERSATIONS),
  );
  useEffect(() => {
    const syncSeen = () => {
      setSeenOrders(readAdminSeenIds(ADMIN_SEEN_ORDERS));
      setSeenConversations(readAdminSeenIds(ADMIN_SEEN_CONVERSATIONS));
    };
    window.addEventListener(ADMIN_NOTIFICATIONS_EVENT, syncSeen);
    window.addEventListener("storage", syncSeen);
    return () => {
      window.removeEventListener(ADMIN_NOTIFICATIONS_EVENT, syncSeen);
      window.removeEventListener("storage", syncSeen);
    };
  }, []);
  const newOrders = orders.filter(
    (order) => !order.isDemo && !seenOrders.has(order.id),
  );
  const newConversations = conversations.filter(
    (conversation) =>
      conversation.unreadForAdmin > 0 ||
      !seenConversations.has(conversation.id),
  );
  const lowStockProducts = products.filter(
    (product) =>
      product.status === "published" &&
      product.stock >= 0 &&
      product.stock <=
        (product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD) &&
      (product.availability === "available" ||
        product.availability === "soldout"),
  );
  const unreadMessages = newConversations.reduce(
    (total, conversation) => total + (conversation.unreadForAdmin || 0),
    0,
  );
  const count =
    newOrders.length +
    unreadMessages +
    newConversations.filter((conversation) => !conversation.unreadForAdmin)
      .length +
    lowStockProducts.length;
  return (
    <div className="notification-bell" ref={bellRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label={count ? `${count} notificações não lidas` : "Notificações"}
        aria-expanded={open}
        aria-controls="admin-notification-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={21} />
        {count > 0 && (
          <span className="unread-badge">{count > 99 ? "99+" : count}</span>
        )}
      </button>
      {open && (
        <section className="notification-panel" id="admin-notification-panel">
          <header>
            <strong>Notificações</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar notificações"
            >
              <X size={17} />
            </button>
          </header>
          {!newOrders.length &&
          !newConversations.length &&
          !lowStockProducts.length ? (
            <p className="notification-empty">Tudo em dia por aqui.</p>
          ) : (
            <div className="notification-list">
              {newOrders.length > 0 && (
                <Link
                  to="/admin?tab=orders"
                  onClick={() => {
                    newOrders.forEach((order) =>
                      markAdminNotificationSeen(ADMIN_SEEN_ORDERS, order.id),
                    );
                    setOpen(false);
                  }}
                >
                  <span className="notification-icon">
                    <ShoppingBag size={17} />
                  </span>
                  <span>
                    <strong>
                      {newOrders.length} pedido
                      {newOrders.length === 1 ? "" : "s"} pendente
                      {newOrders.length === 1 ? "" : "s"}
                    </strong>
                  </span>
                </Link>
              )}
              {newConversations.length > 0 && (
                <Link
                  to="/admin?tab=chat"
                  onClick={() => {
                    newConversations.forEach((conversation) =>
                      markAdminNotificationSeen(
                        ADMIN_SEEN_CONVERSATIONS,
                        conversation.id,
                      ),
                    );
                    setOpen(false);
                  }}
                >
                  <span className="notification-icon">
                    <MessageCircle size={17} />
                  </span>
                  <span>
                    <strong>
                      {unreadMessages > 0
                        ? `${unreadMessages} nova${unreadMessages === 1 ? "" : "s"} mensagem${unreadMessages === 1 ? "" : "ns"}`
                        : `${newConversations.length} novo${newConversations.length === 1 ? "" : "s"} atendimento${newConversations.length === 1 ? "" : "s"}`}
                    </strong>
                  </span>
                </Link>
              )}
              {lowStockProducts.length > 0 && (
                <Link to="/admin?tab=products" onClick={() => setOpen(false)}>
                  <span className="notification-icon">
                    <AlertTriangle size={17} />
                  </span>
                  <span>
                    <strong>
                      {lowStockProducts.length} produto
                      {lowStockProducts.length === 1 ? "" : "s"} com estoque
                      baixo
                    </strong>
                    <small>Quantidade no mínimo configurado ou abaixo</small>
                  </span>
                </Link>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function AdminHeaderNotificationBell() {
  const conversations = useAdminConversations();
  const orders = useAdminOrders();
  const products = useRecords<Product>("products", true);
  return (
    <AdminNotificationBell
      orders={orders.data}
      conversations={conversations.data}
      products={products.data}
    />
  );
}
