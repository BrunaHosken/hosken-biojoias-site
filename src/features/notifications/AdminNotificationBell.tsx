import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  MessageCircle,
  MessageSquareQuote,
  PackageCheck,
  ShoppingBag,
  Star,
  X,
} from "lucide-react";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../../app/constants";
import {
  useAdminConversations,
  useAdminOrders,
  useAdminReviews,
  useAdminTestimonials,
  useRecords,
  type ChatConversation,
  type CustomerOrder,
  type Product,
  type ProductReview,
  type Testimonial,
} from "../../data";
import {
  markAdminNotificationSeen,
  readAdminSeenIds,
  ADMIN_NOTIFICATIONS_EVENT,
  ADMIN_SEEN_DELIVERIES,
  ADMIN_SEEN_CONVERSATIONS,
  ADMIN_SEEN_ORDERS,
  ADMIN_SEEN_REVIEWS,
  ADMIN_SEEN_TESTIMONIALS,
  updateAppIconBadge,
} from "./notificationStorage";
import { useDismissNotificationOnOutside } from "./useDismissNotificationOnOutside";

function conversationNotificationId(conversation: ChatConversation) {
  const requestedAt = conversation.customerRequestedAt?.toMillis();
  return requestedAt
    ? `${conversation.id}:request:${requestedAt}`
    : conversation.id;
}

function AdminNotificationBell({
  orders,
  conversations,
  products,
  reviews,
  testimonials,
  onOpen,
}: {
  orders: CustomerOrder[];
  conversations: ChatConversation[];
  products: Product[];
  reviews: ProductReview[];
  testimonials: Testimonial[];
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  useDismissNotificationOnOutside(bellRef, open, setOpen);
  const [seenOrders, setSeenOrders] = useState(() =>
    readAdminSeenIds(ADMIN_SEEN_ORDERS),
  );
  const [seenDeliveries, setSeenDeliveries] = useState(() =>
    readAdminSeenIds(ADMIN_SEEN_DELIVERIES),
  );
  const [seenConversations, setSeenConversations] = useState(() =>
    readAdminSeenIds(ADMIN_SEEN_CONVERSATIONS),
  );
  const [seenReviews, setSeenReviews] = useState(() =>
    readAdminSeenIds(ADMIN_SEEN_REVIEWS),
  );
  const [seenTestimonials, setSeenTestimonials] = useState(() =>
    readAdminSeenIds(ADMIN_SEEN_TESTIMONIALS),
  );
  useEffect(() => {
    const syncSeen = () => {
      setSeenOrders(readAdminSeenIds(ADMIN_SEEN_ORDERS));
      setSeenDeliveries(readAdminSeenIds(ADMIN_SEEN_DELIVERIES));
      setSeenConversations(readAdminSeenIds(ADMIN_SEEN_CONVERSATIONS));
      setSeenReviews(readAdminSeenIds(ADMIN_SEEN_REVIEWS));
      setSeenTestimonials(readAdminSeenIds(ADMIN_SEEN_TESTIMONIALS));
    };
    window.addEventListener(ADMIN_NOTIFICATIONS_EVENT, syncSeen);
    window.addEventListener("storage", syncSeen);
    return () => {
      window.removeEventListener(ADMIN_NOTIFICATIONS_EVENT, syncSeen);
      window.removeEventListener("storage", syncSeen);
    };
  }, []);
  const newOrders = orders.filter(
    (order) =>
      (!order.isDemo || order.notificationEligible === true) &&
      !seenOrders.has(order.id),
  );
  const confirmedDeliveries = orders.filter(
    (order) => order.customerConfirmedAt && !seenDeliveries.has(order.id),
  );
  const newConversations = conversations.filter(
    (conversation) =>
      conversation.unreadForAdmin > 0 ||
      (conversation.status === "open" &&
        Boolean(
          conversation.customerRequestedAt ||
          conversation.lastMessageId ||
          conversation.lastMessage,
        ) &&
        !seenConversations.has(conversationNotificationId(conversation))),
  );
  const lowStockProducts = products.filter(
    (product) =>
      product.status === "published" &&
      product.stock >= 0 &&
      product.stock <=
        (product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD) &&
      (product.availability === "available" ||
        product.availability === "soldout" ||
        product.availability === "paused"),
  );
  const newReviews = reviews.filter((review) => !seenReviews.has(review.id));
  const newTestimonials = testimonials.filter(
    (testimonial) => !seenTestimonials.has(testimonial.id),
  );
  const unreadConversations = newConversations.filter(
    (conversation) => conversation.unreadForAdmin > 0,
  ).length;
  const count =
    newOrders.length +
    confirmedDeliveries.length +
    newConversations.length +
    lowStockProducts.length +
    newReviews.length;
  const notificationCount = count + newTestimonials.length;

  useEffect(() => {
    void updateAppIconBadge(notificationCount);
  }, [notificationCount]);

  useEffect(
    () => () => {
      void updateAppIconBadge(0);
    },
    [],
  );

  return (
    <div className="notification-bell" ref={bellRef}>
      <button
        type="button"
        className={`notification-bell-button${notificationCount > 0 ? " has-notifications" : ""}${open ? " is-open" : ""}`}
        aria-label={notificationCount ? `${notificationCount} notificações não lidas` : "Notificações"}
        aria-expanded={open}
        aria-controls="admin-notification-panel"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          onOpen?.();
          setOpen(true);
        }}
      >
        <Bell size={21} />
        <span className="mobile-action-label">Notificações</span>
        {notificationCount > 0 && (
          <span className="unread-badge">{notificationCount > 99 ? "99+" : notificationCount}</span>
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
          !confirmedDeliveries.length &&
          !newConversations.length &&
          !lowStockProducts.length &&
          !newReviews.length &&
          !newTestimonials.length ? (
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
                      {newOrders.length === 1 ? "" : "s"} novo
                      {newOrders.length === 1 ? "" : "s"}
                    </strong>
                  </span>
                </Link>
              )}
              {confirmedDeliveries.length > 0 && (
                <Link
                  to="/admin?tab=orders"
                  onClick={() => {
                    confirmedDeliveries.forEach((order) =>
                      markAdminNotificationSeen(ADMIN_SEEN_DELIVERIES, order.id),
                    );
                    setOpen(false);
                  }}
                >
                  <span className="notification-icon">
                    <PackageCheck size={17} />
                  </span>
                  <span>
                    <strong>
                      {confirmedDeliveries.length} pedido
                      {confirmedDeliveries.length === 1 ? "" : "s"} com recebimento
                      confirmado
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
                        conversationNotificationId(conversation),
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
                      {unreadConversations === newConversations.length
                        ? `${unreadConversations} conversa${unreadConversations === 1 ? "" : "s"} com mensagens novas`
                        : unreadConversations > 0
                          ? `Novidades em ${newConversations.length} conversa${newConversations.length === 1 ? "" : "s"}`
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
              {newReviews.length > 0 && (
                <Link
                  to="/admin?tab=reviews"
                  onClick={() => {
                    newReviews.forEach((review) =>
                      markAdminNotificationSeen(ADMIN_SEEN_REVIEWS, review.id),
                    );
                    setOpen(false);
                  }}
                >
                  <span className="notification-icon"><Star size={17} /></span>
                  <span>
                    <strong>
                      {newReviews.length} produto
                      {newReviews.length === 1 ? "" : "s"} avaliado
                      {newReviews.length === 1 ? "" : "s"}
                    </strong>
                  </span>
                </Link>
              )}
              {newTestimonials.length > 0 && (
                <Link
                  to="/admin?tab=testimonials"
                  onClick={() => {
                    newTestimonials.forEach((testimonial) =>
                      markAdminNotificationSeen(
                        ADMIN_SEEN_TESTIMONIALS,
                        testimonial.id,
                      ),
                    );
                    setOpen(false);
                  }}
                >
                  <span className="notification-icon">
                    <MessageSquareQuote size={17} />
                  </span>
                  <span>
                    <strong>
                      {newTestimonials.length} novo
                      {newTestimonials.length === 1 ? "" : "s"} depoimento
                      {newTestimonials.length === 1 ? "" : "s"}
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

export function AdminHeaderNotificationBell({
  onOpen,
}: {
  onOpen?: () => void;
}) {
  const conversations = useAdminConversations();
  const orders = useAdminOrders();
  const products = useRecords<Product>("products", true);
  const reviews = useAdminReviews();
  const testimonials = useAdminTestimonials();
  return (
    <AdminNotificationBell
      orders={orders.data}
      conversations={conversations.data}
      products={products.data}
      reviews={reviews.data}
      testimonials={testimonials.data}
      onOpen={onOpen}
    />
  );
}
