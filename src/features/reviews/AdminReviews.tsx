import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useToast } from "../../app/contexts";
import { ImageLightbox } from "../../components/ImageLightbox";
import { Pagination } from "../../components/Pagination";
import {
  setReviewFeatured,
  setHomepageReviewLimit,
  useAdminOrders,
  useAdminReviews,
  useHomepageReviewSettings,
  type ProductReview,
} from "../../data";
import { ReviewStars } from "./ReviewCard";

const REVIEWS_PER_PAGE = 10;

function reviewKey(orderId: string, itemIndex: number) {
  return `${orderId}:${itemIndex}`;
}

export function AdminReviews() {
  const reviews = useAdminReviews();
  const orders = useAdminOrders();
  const homepageSettings = useHomepageReviewSettings();
  const notify = useToast();
  const [busyId, setBusyId] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [homepageLimitDraft, setHomepageLimitDraft] = useState("5");
  const [savingLimit, setSavingLimit] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setHomepageLimitDraft(String(homepageSettings.homepageLimit));
  }, [homepageSettings.homepageLimit]);
  const reviewKeys = new Set(
    reviews.data.map((review) => reviewKey(review.orderId, review.itemIndex)),
  );
  const pendingByOrderType = orders.data.reduce(
    (counts, order) => {
      if (order.status !== "completed") return counts;
      const unreviewed = order.items.filter(
        (item, index) =>
          item.productId !== "custom" &&
          !reviewKeys.has(reviewKey(order.id, index)),
      ).length;
      counts.total += unreviewed;
      if (order.isDemo) counts.demo += unreviewed;
      return counts;
    },
    { total: 0, demo: 0 },
  );
  const sortedReviews = useMemo(
    () =>
      [...reviews.data].sort(
        (a, b) =>
          (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
      ),
    [reviews.data],
  );
  const average = reviews.data.length
    ? reviews.data.reduce((sum, review) => sum + review.rating, 0) / reviews.data.length
    : 0;
  const featuredCount = reviews.data.filter((review) => review.featuredHome).length;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.data.filter((review) => review.rating === rating).length,
  }));
  const filteredReviews = sortedReviews.filter(
    (review) => ratingFilter === "all" || review.rating === Number(ratingFilter),
  );
  const pageCount = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const visibleReviews = filteredReviews.slice(
    (safePage - 1) * REVIEWS_PER_PAGE,
    safePage * REVIEWS_PER_PAGE,
  );

  async function saveHomepageLimit() {
    const nextLimit = Number(homepageLimitDraft);
    if (!Number.isInteger(nextLimit) || nextLimit < 1 || nextLimit > 30) {
      notify("Escolha um limite entre 1 e 30 avaliações.", "error");
      return;
    }
    if (nextLimit < featuredCount) {
      notify("Remova alguns destaques da página inicial antes de reduzir esse limite.", "error");
      return;
    }
    setSavingLimit(true);
    try {
      await setHomepageReviewLimit(nextLimit);
      notify("Limite de avaliações em destaque atualizado.", "success");
    } catch {
      notify("Não foi possível atualizar o limite de avaliações.", "error");
    } finally {
      setSavingLimit(false);
    }
  }

  async function toggleFeatured(review: ProductReview) {
    setBusyId(review.id);
    try {
      await setReviewFeatured(review.id, !review.featuredHome);
      notify(
        review.featuredHome
          ? "Avaliação removida da página inicial."
          : "Avaliação destacada na página inicial.",
        "success",
      );
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "";
      notify(
        message.includes("homepage-review-limit")
          ? `A página inicial comporta até ${homepageSettings.homepageLimit} avaliações em destaque. Remova uma antes de destacar outra.`
          : "Não foi possível atualizar esta avaliação.",
        "error",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="admin-reviews">
      <div className="review-section-heading">
        <div>
          <div className="eyebrow">VOZES DE QUEM COMPROU</div>
          <h2>Avaliações</h2>
          <p>As avaliações verificadas aparecem automaticamente nas páginas das peças.</p>
        </div>
      </div>
      <div className="review-admin-stats">
        <article><strong>{reviews.data.length}</strong><span>Avaliações recebidas</span></article>
        <article>
          <strong>{pendingByOrderType.total}</strong>
          <span>Peças aguardando avaliação do cliente</span>
          <small>{pendingByOrderType.demo} em pedidos de demonstração, incluindo os seeds de teste</small>
        </article>
        <article><strong>{average ? average.toFixed(1).replace(".", ",") : "—"}</strong><span>Nota média</span></article>
        <article><strong>{featuredCount}/{homepageSettings.homepageLimit}</strong><span>Em destaque na página inicial</span></article>
      </div>
      <div className="homepage-review-limit">
        <label htmlFor="homepage-review-limit">Máximo de avaliações em destaque</label>
        <div>
          <input
            id="homepage-review-limit"
            type="number"
            min="1"
            max="30"
            step="1"
            value={homepageLimitDraft}
            onChange={(event) => setHomepageLimitDraft(event.target.value)}
          />
          <button className="button secondary" type="button" disabled={savingLimit || homepageSettings.loading} onClick={() => void saveHomepageLimit()}>
            {savingLimit ? "Salvando…" : "Salvar limite"}
          </button>
        </div>
        <small>Escolha de 1 a 30. O carrossel mostra até três por vez.</small>
        {homepageSettings.error && <small role="alert">{homepageSettings.error}</small>}
      </div>
      <div className="review-rating-distribution" aria-label="Distribuição das notas">
        {distribution.map(({ rating, count }) => (
          <div key={rating}>
            <span>{rating} <Star size={14} fill="currentColor" /></span>
            <div><i style={{ width: `${reviews.data.length ? (count / reviews.data.length) * 100 : 0}%` }} /></div>
            <small>{count}</small>
          </div>
        ))}
      </div>
      <div className="admin-review-filter">
        <span>Filtrar por classificação</span>
        <div className="review-rating-filter" role="group" aria-label="Filtrar avaliações por classificação">
          <button type="button" aria-pressed={ratingFilter === "all"} className={ratingFilter === "all" ? "is-active" : ""} onClick={() => { setRatingFilter("all"); setPage(1); }}>
            Todas <small>{reviews.data.length}</small>
          </button>
          {distribution.map(({ rating, count }) => (
            <button type="button" key={rating} aria-pressed={ratingFilter === String(rating)} className={ratingFilter === String(rating) ? "is-active" : ""} onClick={() => { setRatingFilter(String(rating)); setPage(1); }}>
              {rating}★ <small>{count}</small>
            </button>
          ))}
        </div>
      </div>
      {(reviews.loading || orders.loading) && <p role="status">Carregando avaliações…</p>}
      {(reviews.error || orders.error) && <p className="notice" role="alert">{reviews.error || orders.error}</p>}
      {!reviews.loading && !reviews.error && sortedReviews.length === 0 && (
        <div className="empty"><h3>Ainda não há avaliações</h3><p>Quando clientes avaliarem pedidos concluídos, elas aparecerão aqui.</p></div>
      )}
      {filteredReviews.length > 0 && (
        <p className="muted admin-review-result-count">
          Mostrando {Math.min((safePage - 1) * REVIEWS_PER_PAGE + 1, filteredReviews.length)}–{Math.min(safePage * REVIEWS_PER_PAGE, filteredReviews.length)} de {filteredReviews.length} avaliações.
        </p>
      )}
      <div className="admin-review-list">
        {visibleReviews.map((review) => (
          <article className="admin-review-card" key={review.id}>
            <header>
              <div><ReviewStars rating={review.rating} /><small>{review.createdAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(review.createdAt.toDate()) : "Data indisponível"}</small></div>
              <span>{review.anonymous ? "Anônima" : review.customerName || "Cliente"}</span>
            </header>
            <h3>{review.productName}</h3>
            <small>Pedido {review.orderNumber || review.orderId.slice(-8).toUpperCase()}</small>
            {review.text ? <p>{review.text}</p> : <p className="muted">Avaliação sem comentário.</p>}
            {review.photos.length > 0 && (
              <div className="review-photo-list">
                {review.photos.map((photo, index) => (
                  <button
                    type="button"
                    key={photo.path}
                    aria-label={`Ampliar foto ${index + 1} da avaliação`}
                    onClick={() => setLightboxImage(photo.url)}
                  >
                    <img src={photo.url} alt={`Foto ${index + 1} da avaliação`} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <button className="button secondary" type="button" disabled={busyId === review.id || (!review.featuredHome && featuredCount >= homepageSettings.homepageLimit)} onClick={() => void toggleFeatured(review)}>
              {busyId === review.id ? "Salvando…" : review.featuredHome ? "Remover da página inicial" : "Destacar na página inicial"}
            </button>
          </article>
        ))}
      </div>
      {!reviews.loading && !reviews.error && sortedReviews.length > 0 && filteredReviews.length === 0 && (
        <div className="empty"><p>Não há avaliações com essa classificação.</p></div>
      )}
      <Pagination page={safePage} pageCount={pageCount} onChange={setPage} label="Paginação de avaliações" />
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt="Foto da avaliação"
          onClose={() => setLightboxImage("")}
        />
      )}
    </section>
  );
}
