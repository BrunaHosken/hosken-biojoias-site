import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, MessageCircle, ShoppingBag, X } from "lucide-react";
import { useCustomerConversation, useCustomerOrders, useCustomerReviews } from "../../data";
import {
  CUSTOMER_NOTIFICATIONS_EVENT,
  readCustomerNotificationState,
  saveCustomerNotificationState,
  type CustomerNotificationState,
  updateAppIconBadge,
} from "./notificationStorage";
import { useDismissNotificationOnOutside } from "./useDismissNotificationOnOutside";

export function CustomerHeaderNotificationBell({ uid }: { uid: string }) {
  const orders = useCustomerOrders(uid);
  const reviews = useCustomerReviews(uid);
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
  const unreadConversations = unreadMessages > 0 ? 1 : 0;
  const pendingOrders = Object.entries(notificationState.pendingOrders);
  const reviewedItems = new Set(
    reviews.data.map((review) => `${review.orderId}:${review.itemIndex}`),
  );
  const pendingReviews =
    orders.loading || orders.error || reviews.loading || reviews.error
      ? []
      : orders.data.flatMap((order) =>
          order.status === "completed"
            ? order.items.flatMap((item, itemIndex) =>
                item.productId !== "custom" &&
                !reviewedItems.has(`${order.id}:${itemIndex}`)
                  ? [{ order, item, itemIndex }]
                  : [],
              )
            : [],
        );
  const count = unreadConversations + pendingOrders.length + pendingReviews.length;

  useEffect(() => {
    void updateAppIconBadge(count);
  }, [count]);

  useEffect(
    () => () => {
      void updateAppIconBadge(0);
    },
    [],
  );

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
        className={`notification-bell-button${count > 0 ? " has-notifications" : ""}${open ? " is-open" : ""}`}
        aria-label={count ? `${count} notificações não lidas` : "Notificações"}
        aria-expanded={open}
        aria-controls="customer-notification-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={21} />
        <span className="mobile-action-label">Notificações</span>
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
              {pendingReviews.map(({ order, item, itemIndex }) => (
                <Link
                  to={`/avaliar?pedido=${encodeURIComponent(order.id)}&item=${itemIndex}`}
                  key={`${order.id}:${itemIndex}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="notification-icon"><ShoppingBag size={17} /></span>
                  <span>
                    <strong>Conte como foi sua experiência</strong>
                    <small>{item.name} · pedido {order.orderNumber || order.id.slice(-8).toUpperCase()}</small>
                  </span>
                </Link>
              ))}
              {unreadConversations > 0 && (
                <Link to="/chat" onClick={() => setOpen(false)}>
                  <span className="notification-icon">
                    <MessageCircle size={17} />
                  </span>
                  <span>
                    <strong>Conversa com mensagens novas do ateliê</strong>
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
