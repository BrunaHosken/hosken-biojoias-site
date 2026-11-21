import { useMemo, useState } from "react";
import { Notice } from "../../components/Feedback";
import type { ProductReviewsResult } from "../../data";
import { ReviewCard, ReviewStars } from "./ReviewCard";

export function ProductReviews({
  result,
}: {
  result: ProductReviewsResult;
}) {
  const [ratingFilter, setRatingFilter] = useState("all");
  const reviews = useMemo(
    () =>
      [...result.data].sort(
        (a, b) =>
          (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
      ),
    [result.data],
  );
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));
  const filteredReviews = reviews.filter(
    (review) => ratingFilter === "all" || review.rating === Number(ratingFilter),
  );
  return (
    <section className="product-reviews" aria-labelledby="product-reviews-title">
      <div className="review-section-heading">
        <div>
          <div className="eyebrow">HISTÓRIAS DE QUEM ESCOLHEU</div>
          <h2 id="product-reviews-title">Avaliações desta peça</h2>
        </div>
        {reviews.length > 0 && (
          <div className="review-average">
            <strong>{average.toFixed(1).replace(".", ",")}</strong>
            <ReviewStars rating={Math.round(average)} />
            <small>Nota média de {reviews.length} avaliações</small>
          </div>
        )}
      </div>
      {reviews.length > 0 && (
        <>
          <div className="review-rating-distribution product-rating-distribution" aria-label="Distribuição das notas desta peça">
            {distribution.map(({ rating, count }) => (
              <div key={rating}>
                <span>{rating} <span aria-hidden="true">★</span></span>
                <div><i style={{ width: `${(count / reviews.length) * 100}%` }} /></div>
                <small>{count}</small>
              </div>
            ))}
          </div>
          <div className="review-rating-filter" role="group" aria-label="Filtrar avaliações por nota">
            <button
              type="button"
              aria-pressed={ratingFilter === "all"}
              className={ratingFilter === "all" ? "is-active" : ""}
              onClick={() => setRatingFilter("all")}
            >
              Todas <small>{reviews.length}</small>
            </button>
            {distribution.map(({ rating, count }) => (
              <button
                type="button"
                key={rating}
                aria-pressed={ratingFilter === String(rating)}
                className={ratingFilter === String(rating) ? "is-active" : ""}
                onClick={() => setRatingFilter(String(rating))}
              >
                {rating}★ <small>{count}</small>
              </button>
            ))}
          </div>
        </>
      )}
      <Notice loading={result.loading} error="" />
      {!result.loading && reviews.length === 0 && (
        <p className="muted">Esta peça ainda não recebeu avaliações.</p>
      )}
      {reviews.length > 0 && (
        <div className="product-review-scroll">
          <div className="product-review-grid">
            {filteredReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          {filteredReviews.length === 0 && (
            <p className="muted">Não há avaliações com essa classificação.</p>
          )}
        </div>
      )}
    </section>
  );
}
