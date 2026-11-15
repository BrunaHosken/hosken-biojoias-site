import {
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  MessageCircle,
  ShoppingBag,
  X,
} from "lucide-react";
import { SessionContext } from "../../app/contexts";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../../app/constants";
import {
  useAdminConversations,
  useAdminOrders,
  useCustomerConversation,
  useCustomerOrders,
  useRecords,
  type ChatConversation,
  type CustomerOrder,
  type Product,
} from "../../data";
import { auth } from "../../firebase";

export function FloatingChatButton() {
  const session = useContext(SessionContext);
  const location = useLocation();
  if (location.pathname === "/chat" || location.pathname === "/admin")
    return null;
  return (
    <Link
      to={session.admin ? "/admin?tab=chat" : "/chat"}
      className="chat-fab"
      aria-label={session.admin ? "Abrir atendimentos" : "Falar com o ateliê"}
      title={session.admin ? "Abrir atendimentos" : "Falar com o ateliê"}
    >
      <MessageCircle size={24} />
    </Link>
  );
}

export function AdminNotificationBridge() {
  const location = useLocation();
  const conversations = useAdminConversations(location.pathname !== "/admin");
  const unreadCount = conversations.data.reduce(
    (sum, conversation) => sum + (conversation.unreadForAdmin || 0),
    0,
  );
  useEffect(() => {
    if (location.pathname === "/admin") return;
    document.title = unreadCount
      ? `(${unreadCount}) Atendimento · Hosken Biojoias`
      : "Hosken Biojoias";
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
  }, [location.pathname, unreadCount]);
  return null;
}
export function CustomerNotificationBridge({ uid }: { uid: string }) {
  const conversation = useCustomerConversation(uid);
  const [pendingOrderCount, setPendingOrderCount] = useState(
    () => Object.keys(readCustomerNotificationState(uid).pendingOrders).length,
  );

  useEffect(() => {
    const syncPendingOrders = () =>
      setPendingOrderCount(
        Object.keys(readCustomerNotificationState(uid).pendingOrders).length,
      );
    syncPendingOrders();
    window.addEventListener(CUSTOMER_NOTIFICATIONS_EVENT, syncPendingOrders);
    window.addEventListener("storage", syncPendingOrders);
    return () => {
      window.removeEventListener(
        CUSTOMER_NOTIFICATIONS_EVENT,
        syncPendingOrders,
      );
      window.removeEventListener("storage", syncPendingOrders);
    };
  }, [uid]);

  const unreadCount =
    (conversation.conversation?.unreadForCustomer || 0) + pendingOrderCount;
  useEffect(() => {
    document.title = unreadCount
      ? `(${unreadCount}) Hosken Biojoias`
      : "Hosken Biojoias";
    const appNavigator = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unreadCount > 0) {
      appNavigator.setAppBadge?.(unreadCount).catch(() => {});
    } else {
      appNavigator.clearAppBadge?.().catch(() => {});
    }
  }, [unreadCount]);

  useEffect(
    () => () => {
      document.title = "Hosken Biojoias";
      const appNavigator = navigator as Navigator & {
        clearAppBadge?: () => Promise<void>;
      };
      appNavigator.clearAppBadge?.().catch(() => {});
    },
    [],
  );
  return null;
}

const ADMIN_SEEN_ORDERS = "hosken-admin-seen-orders";
export const ADMIN_SEEN_CONVERSATIONS = "hosken-admin-seen-conversations";
const ADMIN_NOTIFICATIONS_EVENT = "hosken-admin-notifications-updated";
const CUSTOMER_NOTIFICATIONS_EVENT = "hosken-customer-notifications-updated";
function useDismissNotificationOnOutside(
  root: RefObject<HTMLDivElement | null>,
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, root, setOpen]);
}
function readAdminSeenIds(key: string) {
  try {
    const values = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set<string>(Array.isArray(values) ? values : []);
  } catch {
    return new Set<string>();
  }
}
export function markAdminNotificationSeen(key: string, id: string) {
  try {
    const values = readAdminSeenIds(key);
    values.add(id);
    localStorage.setItem(key, JSON.stringify([...values]));
    window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_EVENT));
  } catch {
    /* O aviso segue funcionando durante esta sessão. */
  }
}
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

type CustomerOrderFingerprint = {
  status: string;
  trackingCode: string;
  updatedAt: number | null;
};
type CustomerOrderUpdate = {
  orderCode: string;
  updatedAt: number;
};
type CustomerNotificationState = {
  orders: Record<string, CustomerOrderFingerprint>;
  pendingOrders: Record<string, CustomerOrderUpdate>;
  acknowledgedOrderUpdates: Record<string, number>;
};
function customerNotificationKey(uid: string) {
  return `hosken-customer-notifications:${uid}`;
}
function readCustomerNotificationState(uid: string): CustomerNotificationState {
  try {
    const value = JSON.parse(
      localStorage.getItem(customerNotificationKey(uid)) || "null",
    );
    if (value && typeof value === "object") {
      return {
        orders:
          value.orders && typeof value.orders === "object" ? value.orders : {},
        pendingOrders:
          value.pendingOrders && typeof value.pendingOrders === "object"
            ? value.pendingOrders
            : {},
        acknowledgedOrderUpdates:
          value.acknowledgedOrderUpdates &&
          typeof value.acknowledgedOrderUpdates === "object"
            ? value.acknowledgedOrderUpdates
            : {},
      };
    }
  } catch {
    /* O sino continua disponível durante esta sessão. */
  }
  return { orders: {}, pendingOrders: {}, acknowledgedOrderUpdates: {} };
}
function saveCustomerNotificationState(
  uid: string,
  state: CustomerNotificationState,
) {
  try {
    localStorage.setItem(customerNotificationKey(uid), JSON.stringify(state));
    window.dispatchEvent(new Event(CUSTOMER_NOTIFICATIONS_EVENT));
  } catch {
    /* O sino continua disponível durante esta sessão. */
  }
}
export function CustomerHeaderNotificationBell({ uid }: { uid: string }) {
  const orders = useCustomerOrders(uid);
  const conversation = useCustomerConversation(uid);
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  useDismissNotificationOnOutside(bellRef, open, setOpen);
  const [notificationState, setNotificationState] = useState(() =>
    readCustomerNotificationState(uid),
  );

  useEffect(() => {
    setNotificationState(readCustomerNotificationState(uid));
  }, [uid]);

  useEffect(() => {
    if (orders.loading || orders.error) return;
    const previousState = readCustomerNotificationState(uid);
    const currentFingerprints: CustomerNotificationState["orders"] = {};
    const pendingOrders = { ...previousState.pendingOrders };
    const acknowledgedOrderUpdates = {
      ...previousState.acknowledgedOrderUpdates,
    };

    for (const order of orders.data) {
      const fingerprint = {
        status: order.status,
        trackingCode: order.trackingCode || "",
        updatedAt: order.updatedAt?.toMillis() ?? null,
      };
      currentFingerprints[order.id] = fingerprint;
      const previous = previousState.orders[order.id];
      const createdAt = order.createdAt?.toMillis() ?? 0;
      const acknowledgedAt = acknowledgedOrderUpdates[order.id] ?? createdAt;
      const trackingUpdated = previous
        ? previous.trackingCode !== fingerprint.trackingCode
        : false;
      const fieldsChanged =
        Boolean(previous) &&
        (previous?.status !== fingerprint.status || trackingUpdated);
      const hasUnopenedUpdate =
        fingerprint.updatedAt !== null &&
        fingerprint.updatedAt > acknowledgedAt;

      if (hasUnopenedUpdate || fieldsChanged) {
        pendingOrders[order.id] = {
          orderCode: order.orderNumber || order.id.slice(-8).toUpperCase(),
          updatedAt: fingerprint.updatedAt ?? Date.now(),
        };
      }
    }

    const nextState = {
      orders: currentFingerprints,
      pendingOrders,
      acknowledgedOrderUpdates,
    };
    saveCustomerNotificationState(uid, nextState);
    setNotificationState(nextState);
  }, [orders.data, orders.error, orders.loading, uid]);

  useEffect(() => {
    const syncState = () =>
      setNotificationState(readCustomerNotificationState(uid));
    window.addEventListener(CUSTOMER_NOTIFICATIONS_EVENT, syncState);
    window.addEventListener("storage", syncState);
    return () => {
      window.removeEventListener(CUSTOMER_NOTIFICATIONS_EVENT, syncState);
      window.removeEventListener("storage", syncState);
    };
  }, [uid]);

  const unreadMessages = conversation.conversation?.unreadForCustomer || 0;
  const pendingOrders = Object.entries(notificationState.pendingOrders);
  const count = unreadMessages + pendingOrders.length;

  function clearOrderNotifications() {
    const acknowledgedOrderUpdates = {
      ...notificationState.acknowledgedOrderUpdates,
    };
    for (const [id, update] of Object.entries(
      notificationState.pendingOrders,
    )) {
      acknowledgedOrderUpdates[id] =
        update.updatedAt ??
        notificationState.orders[id]?.updatedAt ??
        Date.now();
    }
    const nextState = {
      ...notificationState,
      pendingOrders: {},
      acknowledgedOrderUpdates,
    };
    saveCustomerNotificationState(uid, nextState);
    setNotificationState(nextState);
    setOpen(false);
  }

  return (
    <div className="notification-bell" ref={bellRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label={count ? `${count} notificações não lidas` : "Notificações"}
        aria-expanded={open}
        aria-controls="customer-notification-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={21} />
        {count > 0 && (
          <span className="unread-badge">{count > 99 ? "99+" : count}</span>
        )}
      </button>
      {open && (
        <section
          className="notification-panel"
          id="customer-notification-panel"
        >
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
          {!count ? (
            <p className="notification-empty">Tudo em dia por aqui.</p>
          ) : (
            <div className="notification-list">
              {pendingOrders.length > 0 && (
                <Link to="/pedidos" onClick={clearOrderNotifications}>
                  <span className="notification-icon">
                    <ShoppingBag size={17} />
                  </span>
                  <span>
                    {pendingOrders.map(([id, update]) => (
                      <span className="customer-order-notification" key={id}>
                        <strong>Pedido atualizado</strong>
                        <small>
                          Pedido{" "}
                          {update.orderCode || id.slice(-8).toUpperCase()}
                        </small>
                      </span>
                    ))}
                  </span>
                </Link>
              )}
              {unreadMessages > 0 && (
                <Link to="/chat" onClick={() => setOpen(false)}>
                  <span className="notification-icon">
                    <MessageCircle size={17} />
                  </span>
                  <span>
                    <strong>
                      {unreadMessages} nova{unreadMessages === 1 ? "" : "s"}{" "}
                      mensagem{unreadMessages === 1 ? "" : "ns"} do ateliê
                    </strong>
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
