import { useEffect, useMemo, useState, type FormEvent } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { orderStatusLabels, orderStatusOptions } from "../../app/constants";
import { useToast } from "../../app/contexts";
import { Notice } from "../../components/Feedback";
import { Pagination } from "../../components/Pagination";
import { auth, db } from "../../firebase";
import {
  cancelDemoOrder,
  canCancelDemoOrder,
  money,
  useAdminOrders,
  type CustomerOrder,
} from "../../data";

const ORDERS_PER_PAGE = 10;

export function AdminOrders({
  orders,
  focusOrderId,
}: {
  orders: ReturnType<typeof useAdminOrders>;
  focusOrderId: string;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const filteredOrders = useMemo(() => {
    const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined;
    const end = dateTo ? new Date(`${dateTo}T23:59:59.999`) : undefined;
    return orders.data.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!start && !end) return true;
      const createdAt = order.createdAt?.toDate();
      if (!createdAt) return false;
      return (!start || createdAt >= start) && (!end || createdAt <= end);
    });
  }, [orders.data, statusFilter, dateFrom, dateTo]);
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const visibleOrders = filteredOrders.slice(
    (safePage - 1) * ORDERS_PER_PAGE,
    safePage * ORDERS_PER_PAGE,
  );
  const focusOrderIndex = orders.data.findIndex((order) => order.id === focusOrderId);

  useEffect(() => {
    if (!focusOrderId || orders.loading) return;
    if (focusOrderIndex < 0) return;
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(Math.floor(focusOrderIndex / ORDERS_PER_PAGE) + 1);
    const timer = window.setTimeout(() => {
      document
        .getElementById(`admin-order-${focusOrderId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusOrderId, focusOrderIndex, orders.loading]);

  return (
    <section className="admin-orders">
      <h2>Pedidos recebidos</h2>
      <p className="muted">
        Atualize o andamento e o rastreio. O status do pagamento e os valores
        não são alterados aqui.
      </p>
      <Notice {...orders} />
      {orders.data.length > 0 && (
        <div className="admin-order-filters">
          <div className="admin-order-status-filters" role="group" aria-label="Filtrar pedidos por andamento">
            <button
              type="button"
              className={statusFilter === "all" ? "is-active" : ""}
              aria-pressed={statusFilter === "all"}
              onClick={() => { setStatusFilter("all"); setPage(1); }}
            >
              Todos <small>{orders.data.length}</small>
            </button>
            {orderStatusOptions.map((value) => {
              const count = orders.data.filter((order) => order.status === value).length;
              return (
                <button
                  type="button"
                  key={value}
                  className={statusFilter === value ? "is-active" : ""}
                  aria-pressed={statusFilter === value}
                  onClick={() => { setStatusFilter(value); setPage(1); }}
                >
                  {orderStatusLabels[value]} <small>{count}</small>
                </button>
              );
            })}
          </div>
          <div className="admin-order-date-filters">
            <label>
              De
              <input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
            </label>
            <label>
              Até
              <input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
            </label>
            {(dateFrom || dateTo) && (
              <button type="button" className="button secondary" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>
                Limpar datas
              </button>
            )}
          </div>
        </div>
      )}
      {filteredOrders.length > 0 && (
        <p className="muted admin-order-result-count">
          Mostrando {Math.min((safePage - 1) * ORDERS_PER_PAGE + 1, filteredOrders.length)}–{Math.min(safePage * ORDERS_PER_PAGE, filteredOrders.length)} de {filteredOrders.length} pedidos.
        </p>
      )}
      {visibleOrders.map((order) => (
        <AdminOrderCard key={order.id} order={order} />
      ))}
      {!orders.loading && !orders.error && orders.data.length === 0 && (
        <p className="muted">Nenhum pedido cadastrado ainda.</p>
      )}
      {!orders.loading && !orders.error && orders.data.length > 0 && filteredOrders.length === 0 && (
        <p className="muted">Nenhum pedido encontrado com esses filtros.</p>
      )}
      <Pagination page={safePage} pageCount={pageCount} onChange={setPage} label="Paginação de pedidos" />
    </section>
  );
}

export function AdminOrderCard({ order }: { order: CustomerOrder }) {
  const notify = useToast();
  const [status, setStatus] = useState(order.status);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || "");
  const [busy, setBusy] = useState(false);
  const createdAt = order.createdAt?.toDate();
  const isCustomOrder = order.items.some((item) => Boolean(item.customQuoteId));

  useEffect(() => {
    setStatus(order.status);
    setTrackingCode(order.trackingCode || "");
  }, [order.status, order.trackingCode]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      if (status === "cancelled" && canCancelDemoOrder(order)) {
        await cancelDemoOrder(order.id);
        if (trackingCode.trim() !== (order.trackingCode || "")) {
          await updateDoc(doc(db, "orders", order.id), {
            trackingCode: trackingCode.trim(),
            updatedAt: serverTimestamp(),
          });
        }
        notify(
          order.stockReserved
            ? "Pedido cancelado; as peças voltaram ao estoque."
            : "Encomenda personalizada cancelada.",
          "success",
        );
      } else {
        await updateDoc(doc(db, "orders", order.id), {
          status,
          trackingCode: trackingCode.trim(),
          ...(order.isDemo &&
          order.reservationStatus === "active" &&
          ["in_transit", "completed"].includes(status)
            ? { reservationStatus: "committed", stockReserved: false }
            : {}),
          updatedAt: serverTimestamp(),
        });
        notify("Status e rastreio atualizados.", "success");
      }
    } catch {
      notify(
        "Não foi possível atualizar este pedido. Tente novamente.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="admin-order-card" id={`admin-order-${order.id}`}>
      <div className="admin-order-summary">
        <div>
          <strong>
            {order.orderNumber || order.id.slice(-8).toUpperCase()}
          </strong>
          {order.isDemo && <span className="tag">PEDIDO DE EXEMPLO</span>}
        </div>
        <p className="admin-customer">
          <strong>{order.customerName || "Cliente"}</strong>
          {order.customerEmail && <span>{order.customerEmail}</span>}
        </p>
        <small>
          {createdAt
            ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
                createdAt,
              )
            : "Data indisponível"}
        </small>
        <ul className="order-items">
          {order.items.map((item, index) => (
            <li key={`${item.productId}-${index}`}>
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
                      item.collectionName
                        ? `Linha: ${item.collectionName}`
                        : "",
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
              <strong>{money(item.quantity * item.unitPriceCents)}</strong>
            </li>
          ))}
        </ul>
        {isCustomOrder && (
          <p className="order-tracking">
            Encomenda personalizada; não altera o estoque do catálogo.
          </p>
        )}
        {order.isGift && (
          <p className="order-tracking">
            Compra para presente
            {order.giftMessage ? ` · Mensagem: ${order.giftMessage}` : ""}
          </p>
        )}
        <p className="order-total">
          <span>Total</span>
          <strong>{money(order.totalCents)}</strong>
        </p>
      </div>
      <form className="admin-order-form" onSubmit={save}>
        <label>
          Andamento
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {orderStatusOptions.map((value) => (
              <option key={value} value={value}>
                {orderStatusLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Código de rastreio (se houver)
          <input
            value={trackingCode}
            maxLength={100}
            onChange={(e) => setTrackingCode(e.target.value)}
            placeholder="Opcional"
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Salvando…" : "Atualizar pedido"}
        </button>
      </form>
    </article>
  );
}
