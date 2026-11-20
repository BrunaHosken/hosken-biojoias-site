import { useEffect, useState, type FormEvent } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { orderStatusLabels, orderStatusOptions } from "../../app/constants";
import { useToast } from "../../app/contexts";
import { Notice } from "../../components/Feedback";
import { auth, db } from "../../firebase";
import {
  cancelDemoOrder,
  money,
  useAdminOrders,
  type CustomerOrder,
} from "../../data";

export function AdminOrders({
  orders,
  focusOrderId,
}: {
  orders: ReturnType<typeof useAdminOrders>;
  focusOrderId: string;
}) {
  useEffect(() => {
    if (!focusOrderId || orders.loading) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`admin-order-${focusOrderId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusOrderId, orders.data.length, orders.loading]);
  return (
    <section className="admin-orders">
      <h2>Pedidos recebidos</h2>
      <p className="muted">
        Atualize o andamento e o rastreio. O status do pagamento e os valores
        não são alterados aqui.
      </p>
      <Notice {...orders} />
      {orders.data.map((order) => (
        <AdminOrderCard key={order.id} order={order} />
      ))}
      {!orders.loading && !orders.error && orders.data.length === 0 && (
        <p className="muted">Nenhum pedido cadastrado ainda.</p>
      )}
    </section>
  );
}

export function AdminOrderCard({ order }: { order: CustomerOrder }) {
  const notify = useToast();
  const [status, setStatus] = useState(order.status);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || "");
  const [busy, setBusy] = useState(false);
  const createdAt = order.createdAt?.toDate();
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      if (
        order.isDemo &&
        status === "cancelled" &&
        order.reservationStatus === "active"
      ) {
        await cancelDemoOrder(order.id);
        if (trackingCode.trim() !== (order.trackingCode || "")) {
          await updateDoc(doc(db, "orders", order.id), {
            trackingCode: trackingCode.trim(),
            updatedAt: serverTimestamp(),
          });
        }
        notify("Pedido cancelado; as peças voltaram ao estoque.", "success");
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
              </span>
              <strong>{money(item.quantity * item.unitPriceCents)}</strong>
            </li>
          ))}
        </ul>
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
