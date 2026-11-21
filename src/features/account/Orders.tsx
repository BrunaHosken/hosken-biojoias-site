import { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, RotateCcw, ShoppingBag } from "lucide-react";
import { orderStatusLabels } from "../../app/constants";
import { SessionContext, useToast } from "../../app/contexts";
import { Notice } from "../../components/Feedback";
import {
  cancelDemoOrder,
  canCancelDemoOrder,
  money,
  useCustomerOrders,
  type CustomerOrder,
} from "../../data";

export function OrdersPage() {
  const session = useContext(SessionContext);
  const orders = useCustomerOrders(session.user?.uid);
  const location = useLocation();
  const allOrders = [...orders.data].sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
  const checkoutState = location.state as {
    checkoutDemo?: string;
    customOrder?: boolean;
  } | null;
  const checkoutResult = checkoutState?.checkoutDemo;
  const checkoutCustomOrder = checkoutState?.customOrder === true;
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
      {checkoutResult === "simulated_paid" && (
        <p className="notice" role="status">
          Pagamento de demonstração confirmado. O pedido aparece como em
          produção.{" "}
          {checkoutCustomOrder
            ? "A encomenda personalizada não altera o estoque do catálogo."
            : "O estoque fica reservado até o cancelamento."}{" "}
          Nenhum valor foi cobrado.
        </p>
      )}
      {checkoutResult === "pending" && (
        <p className="notice" role="status">
          Pedido de demonstração criado e aguardando pagamento.{" "}
          {checkoutCustomOrder
            ? "A encomenda personalizada não altera o estoque do catálogo."
            : "O estoque fica reservado até o cancelamento."}{" "}
          Nenhuma cobrança foi feita.
        </p>
      )}
      {allOrders.some((order) => order.isDemo) && (
        <p className="demo-orders-note">
          Os pedidos de demonstração são gravados no Firebase. Compras de peças
          do catálogo reservam o estoque até o cancelamento; encomendas
          personalizadas não alteram o estoque do catálogo. Nenhum pagamento
          real é processado.
        </p>
      )}
      {orders.loading && <p role="status">Carregando pedidos…</p>}
      {orders.error && (
        <p className="notice" role="alert">
          {orders.error}
        </p>
      )}
      {!orders.loading && !orders.error && allOrders.length === 0 && (
        <div className="empty">
          <ShoppingBag />
          <h2>Você ainda não tem pedidos.</h2>
          <p>Quando você concluir uma compra, os pedidos aparecerão aqui.</p>
          <Link className="button secondary" to="/loja">
            Continuar explorando <ArrowRight size={18} />
          </Link>
        </div>
      )}
      <div className="order-list">
        {allOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
export function OrderCard({ order }: { order: CustomerOrder }) {
  const notify = useToast();
  const [cancelBusy, setCancelBusy] = useState(false);
  const status =
    order.isDemo && order.status === "preparing"
      ? "Em produção (simulação)"
      : orderStatusLabels[order.status] || "Em atualização";
  const createdAt = order.createdAt?.toDate();
  const isCustomOrder = order.items.some((item) => Boolean(item.customQuoteId));

  async function cancelOrder() {
    if (
      !window.confirm(
        order.stockReserved
          ? "Cancelar este pedido de teste e devolver as peças ao estoque?"
          : "Cancelar esta encomenda personalizada?",
      )
    ) {
      return;
    }
    setCancelBusy(true);
    try {
      await cancelDemoOrder(order.id);
      notify(
        order.stockReserved
          ? "Pedido cancelado; as peças voltaram ao estoque."
          : "Encomenda personalizada cancelada.",
        "success",
      );
    } catch {
      notify("Não foi possível cancelar o pedido. Tente novamente.", "error");
    } finally {
      setCancelBusy(false);
    }
  }

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
          {order.isDemo && <span className="tag">SIMULAÇÃO</span>}
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
              {(item.categoryName ||
                item.collectionName ||
                item.customDescription ||
                item.colorName ||
                item.withChain !== undefined) && (
                <small className="order-item-options">
                  {[
                    item.categoryName ? `Tipo: ${item.categoryName}` : "",
                    item.collectionName ? `Linha: ${item.collectionName}` : "",
                    item.customDescription || "",
                    item.colorName ? `Cor: ${item.colorName}` : "",
                    item.withChain === undefined
                      ? ""
                      : item.withChain
                        ? "Com corrente"
                        : "Somente o pingente",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              )}
            </span>
            <strong>{money(item.unitPriceCents * item.quantity)}</strong>
          </li>
        ))}
      </ul>
      {(order.customerEmail || order.customerPhone) && (
        <p className="order-tracking">
          Contato:{" "}
          {[order.customerEmail, order.customerPhone]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {order.trackingCode && (
        <p className="order-tracking">
          Código de rastreio: <strong>{order.trackingCode}</strong>
        </p>
      )}
      {order.deliveryMethod && (
        <p className="order-tracking">
          Recebimento:{" "}
          {order.deliveryMethod === "pickup"
            ? "Retirada presencial"
            : "Correios (Sedex)"}
        </p>
      )}
      {order.isGift && (
        <p className="order-tracking">
          Compra para presente
          {order.giftMessage ? ` · Mensagem: ${order.giftMessage}` : ""}
        </p>
      )}
      {order.deliveryAddress && (
        <p className="order-tracking">
          Endereço de entrega: <strong>{order.deliveryAddress}</strong>
        </p>
      )}
      {order.isDemo && order.deliveryMethod === "sedex" && (
        <p className="order-tracking">
          Frete a combinar; não está incluído no total desta simulação.
        </p>
      )}
      {order.paymentMethod && (
        <p className="order-tracking">
          Pagamento:{" "}
          {order.paymentMethod === "pix"
            ? "Pix"
            : order.paymentMethod === "debit_card"
              ? "Cartão de débito"
              : "Cartão de crédito"}
          {order.installments && order.installments > 1
            ? ` · ${order.installments} parcelas`
            : ""}
          {order.paymentStatus === "simulated_paid"
            ? " · confirmado na simulação"
            : order.paymentStatus === "pending"
              ? " · aguardando pagamento"
              : ""}
          {order.isDemo &&
          order.paymentMethod === "credit_card" &&
          order.installments &&
          order.installments > 1
            ? " · juros demonstrativos incluídos"
            : ""}
        </p>
      )}
      <div className="order-total">
        <span>Total do pedido</span>
        <strong>{money(order.totalCents)}</strong>
      </div>
      {order.stockReserved && order.reservationStatus === "active" && (
        <p className="order-tracking">
          Estoque reservado até o cancelamento deste pedido.
        </p>
      )}
      {isCustomOrder && (
        <p className="order-tracking">
          Encomenda personalizada; não altera o estoque do catálogo.
        </p>
      )}
      {canCancelDemoOrder(order) && (
        <button
          className="text-button order-cancel-button"
          type="button"
          disabled={cancelBusy}
          onClick={cancelOrder}
        >
          <RotateCcw size={16} />
          {cancelBusy
            ? "Cancelando…"
            : order.stockReserved
              ? "Cancelar pedido e liberar estoque"
              : "Cancelar encomenda"}
        </button>
      )}
      {order.isDemo && (
        <p className="demo-note">
          Compra fictícia para testar o fluxo. Nenhum pagamento foi processado.
        </p>
      )}
    </article>
  );
}
