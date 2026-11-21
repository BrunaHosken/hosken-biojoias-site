import { useState } from "react";
import { Star } from "lucide-react";
import { ImageLightbox } from "../../components/ImageLightbox";
import type { PublicProductReview } from "../../data";

export function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="review-stars" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={16}
          fill={index < rating ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function ReviewCard({
  review,
  showProduct = false,
  carousel = false,
}: {
  review: PublicProductReview;
  showProduct?: boolean;
  carousel?: boolean;
}) {
  const [lightbox, setLightbox] = useState("");
  const date = review.createdAt?.toDate();
  return (
    <article className={`review-card${carousel ? " review-card-carousel" : ""}`}>
      <div className="review-card-heading">
        <ReviewStars rating={review.rating} />
        {date && (
          <time dateTime={date.toISOString()}>
            {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date)}
          </time>
        )}
      </div>
      <div className="review-card-content">
        {showProduct && review.productName && (
          <small className="review-product-name">{review.productName}</small>
        )}
        {review.text && <p>{review.text}</p>}
        {review.photos.length > 0 && (
          <div className="review-photo-list">
            {review.photos.map((photo, index) => (
              <button
                type="button"
                key={photo.path}
                aria-label={`Ampliar foto ${index + 1} da avaliação`}
                onClick={() => setLightbox(photo.url)}
              >
                <img src={photo.url} alt={`Foto ${index + 1} enviada na avaliação`} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
      <footer>{review.anonymous ? "Cliente anônimo" : review.displayName || "Cliente"}</footer>
      {lightbox && (
        <ImageLightbox
          src={lightbox}
          alt="Foto da avaliação"
          onClose={() => setLightbox("")}
        />
      )}
    </article>
  );
}
