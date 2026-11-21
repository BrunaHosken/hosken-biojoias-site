import { useContext, useMemo } from "react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { SessionContext } from "../../app/contexts";
import { useCustomerOrders, useCustomerReviews } from "../../data";

function reviewKey(orderId: string, itemIndex: number) {
  return `${orderId}:${itemIndex}`;
}

export function CustomerReviewsPage() {
  const session = useContext(SessionContext);
  const orders = useCustomerOrders(session.user?.uid);
  const reviews = useCustomerReviews(session.user?.uid);
  const reviewedByKey = useMemo(
    () => new Map(reviews.data.map((review) => [reviewKey(review.orderId, review.itemIndex), review])),
    [reviews.data],
  );
  const entries = useMemo(
    () =>
      orders.data.flatMap((order) =>
        order.status !== "completed"
          ? []
          : order.items.flatMap((item, itemIndex) =>
              !item.productId || item.productId === "custom"
                ? []
                : [{
                    order,
                    item,
                    itemIndex,
                    review: reviewedByKey.get(reviewKey(order.id, itemIndex)),
                  }],
            ),
      ),
    [orders.data, reviewedByKey],
  );
  const pending = entries.filter((entry) => !entry.review);
  const submitted = entries.filter((entry) => entry.review);

  if (!session.ready) return <div className="page">Carregando sua conta…</div>;
  if (!session.user) {
    return (
      <div className="page narrow">
        <div className="eyebrow">SUA EXPERIÊNCIA</div>
        <h1>Minhas avaliações</h1>
        <p className="lead">Entre na sua conta para ver as peças que pode avaliar e suas avaliações enviadas.</p>
        <Link className="button" to="/conta?returnTo=%2Fminhas-avaliacoes">Entrar na conta</Link>
      </div>
    );
  }

  return (
    <div className="page customer-reviews-page">
      <div className="eyebrow">SUA EXPERIÊNCIA COM A HOSKEN</div>
      <h1>Minhas avaliações</h1>
      <p className="lead">Aqui estão as peças de pedidos concluídos que você pode avaliar e as opiniões que já compartilhou.</p>
      <Link className="text-link customer-reviews-back-link" to="/pedidos">
        <ArrowLeft size={16} /> Voltar para meus pedidos
      </Link>
      {(orders.loading || reviews.loading) && <p role="status">Carregando suas avaliações…</p>}
      {(orders.error || reviews.error) && <p className="notice" role="alert">{orders.error || reviews.error}</p>}

      {!orders.loading && !reviews.loading && !orders.error && !reviews.error && entries.length === 0 && (
        <div className="empty">
          <Star />
          <h2>Ainda não há peças para avaliar</h2>
          <p>Quando um pedido for concluído, as peças do catálogo aparecerão aqui.</p>
          <Link className="button secondary" to="/pedidos">Ver meus pedidos <ArrowRight size={18} /></Link>
        </div>
      )}

      {pending.length > 0 && (
        <section className="customer-review-section" aria-labelledby="pending-reviews-title">
          <header>
            <div>
              <div className="eyebrow">SUA OPINIÃO FAZ DIFERENÇA</div>
              <h2 id="pending-reviews-title">Peças para avaliar <span>{pending.length}</span></h2>
            </div>
          </header>
          <div className="customer-review-list">
            {pending.map(({ order, item, itemIndex }) => (
              <article className="customer-review-item" key={reviewKey(order.id, itemIndex)}>
                <div>
                  <h3>{item.name}</h3>
                  <p>Pedido {order.orderNumber || order.id.slice(-8).toUpperCase()}</p>
                  {(item.colorName || item.categoryName || item.collectionName) && (
                    <small>{[item.categoryName, item.collectionName, item.colorName].filter(Boolean).join(" · ")}</small>
                  )}
                </div>
                <Link className="button secondary" to={`/avaliar?pedido=${encodeURIComponent(order.id)}&item=${itemIndex}`}>
                  Avaliar <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {submitted.length > 0 && (
        <section className="customer-review-section" aria-labelledby="submitted-reviews-title">
          <header>
            <div>
              <div className="eyebrow">OPINIÕES COMPARTILHADAS</div>
              <h2 id="submitted-reviews-title">Peças já avaliadas <span>{submitted.length}</span></h2>
            </div>
          </header>
          <div className="customer-review-list">
            {submitted.map(({ order, item, itemIndex, review }) => (
              <article className="customer-review-item customer-review-submitted" key={reviewKey(order.id, itemIndex)}>
                <div>
                  <h3>{item.name}</h3>
                  <p>Pedido {order.orderNumber || order.id.slice(-8).toUpperCase()}</p>
                  <div className="customer-review-rating" aria-label={`${review?.rating || 0} de 5 estrelas`}>
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < (review?.rating || 0) ? "currentColor" : "none"} />)}
                    <small>{review?.anonymous ? "Anônima" : "Sua avaliação"}</small>
                  </div>
                  {review?.text && <small className="customer-review-text">{review.text}</small>}
                </div>
                <Link className="button secondary" to={`/avaliar?pedido=${encodeURIComponent(order.id)}&item=${itemIndex}&editar=1`}>
                  Editar avaliação <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
