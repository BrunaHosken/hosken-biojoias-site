import { useContext } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { orderStatusLabels } from "../../app/constants";
import { SessionContext } from "../../app/contexts";
import { Notice } from "../../components/Feedback";
import { money, useCustomerOrders, type CustomerOrder } from "../../data";

export function OrdersPage() {
  const session = useContext(SessionContext);
  const orders = useCustomerOrders(session.user?.uid);
  if (!session.ready) {
    return <div className="page">Carregando sua conta…</div>;
  }
  if (!session.user) {
    return (
      <div className="page narrow">
        <div className="eyebrow">SEU ESPAÇO NA HOSKEN BIOJOIAS</div>
        <h1>Meus pedidos</h1>
        <p className="lead">
          Entre na sua conta para ver o histórico de pedidos.
        </p>
        <Link className="button" to="/conta">
          Entrar ou criar conta <ArrowRight size={18} />
        </Link>
      </div>
    );
  }
  return (
    <div className="page">
      <div className="eyebrow">ACOMPANHE SUAS ESCOLHAS</div>
      <h1>Meus pedidos</h1>
      <p className="lead">
        Você pode acompanhar o andamento de cada pedido por aqui.
      </p>
      {orders.loading && <p role="status">Carregando pedidos…</p>}
      {orders.error && (
        <p className="notice" role="alert">
          {orders.error}
        </p>
      )}
      {!orders.loading && !orders.error && orders.data.length === 0 && (
        <div className="empty">
          <ShoppingBag />
          <h2>Você ainda não tem pedidos.</h2>
          <p>
            As compras online estão sendo preparadas. Quando o checkout estiver
            ativo, seus pedidos aparecerão aqui.
          </p>
          <Link className="button secondary" to="/loja">
            Continuar explorando <ArrowRight size={18} />
          </Link>
        </div>
      )}
      <div className="order-list">
        {orders.data.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
export function OrderCard({ order }: { order: CustomerOrder }) {
  const status = orderStatusLabels[order.status] || "Em atualização";
  const createdAt = order.createdAt?.toDate();
  return (
    <article className="order-card">
      <header className="order-card-header">
        <div>
          <small>Pedido</small>
          <h2>{order.orderNumber || order.id.slice(-8).toUpperCase()}</h2>
          <small>
            {createdAt
              ? new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "long",
                }).format(createdAt)
              : "Data indisponível"}
          </small>
        </div>
        <div className="order-status-group">
          {order.isDemo && <span className="tag">PEDIDO DE EXEMPLO</span>}
          <span
            className={`order-status status-${order.status.replace(/[^a-z0-9_-]/gi, "")}`}
          >
            {status}
          </span>
        </div>
      </header>
      <ul className="order-items">
        {order.items.map((item, index) => (
          <li key={`${order.id}-${item.productId}-${index}`}>
            <span>
              {item.name} <small>× {item.quantity}</small>
            </span>
            <strong>{money(item.unitPriceCents * item.quantity)}</strong>
          </li>
        ))}
      </ul>
      {order.trackingCode && (
        <p className="order-tracking">
          Código de rastreio: <strong>{order.trackingCode}</strong>
        </p>
      )}
      <div className="order-total">
        <span>Total do pedido</span>
        <strong>{money(order.totalCents)}</strong>
      </div>
      {order.isDemo && (
        <p className="demo-note">
          Exemplo fictício para visualizar o histórico.
        </p>
      )}
    </article>
  );
}
