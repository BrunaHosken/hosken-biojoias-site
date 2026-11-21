import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeaturedReviews, useHomepageReviewSettings } from "../../data";
import { ReviewCard } from "./ReviewCard";

export function HomeReviewCarousel() {
  const featured = useFeaturedReviews();
  const settings = useHomepageReviewSettings();
  const reviews = useMemo(
    () =>
      [...featured.data]
        .sort(
          (a, b) =>
            (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
        )
        .slice(0, settings.homepageLimit),
    [featured.data, settings.homepageLimit],
  );
  const [visibleCount, setVisibleCount] = useState(() =>
    window.matchMedia("(max-width: 720px)").matches ? 1 : 3,
  );
  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const update = () => {
      setVisibleCount(media.matches ? 1 : 3);
      setPageIndex(0);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const pageCount = Math.ceil(reviews.length / visibleCount);
  const visible = reviews.slice(
    pageIndex * visibleCount,
    pageIndex * visibleCount + visibleCount,
  );
  useEffect(() => {
    setPageIndex(0);
  }, [visibleCount, settings.homepageLimit, featured.data]);
  useEffect(() => {
    if (pageCount < 2) return;
    const timer = window.setInterval(() => {
      setPageIndex((current) => (current + 1) % pageCount);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [pageCount, pageIndex]);
  if (featured.loading || !reviews.length) return null;
  return (
    <section className="home-review-section" aria-labelledby="home-reviews-title">
      <div className="section-title">
        <div>
          <div className="eyebrow">CARINHO QUE FLORESCE EM CADA HISTÓRIA</div>
          <h2 id="home-reviews-title">Quem já escolheu, conta</h2>
        </div>
      </div>
      <div className="home-review-carousel">
        <div className="home-review-grid" key={pageIndex}>
          {visible.map((review) => (
            <ReviewCard key={review.id} review={review} showProduct carousel />
          ))}
        </div>
      </div>
      {pageCount > 1 && (
        <div className="home-review-pagination" role="group" aria-label="Páginas de avaliações">
          {Array.from({ length: pageCount }, (_, page) => (
            <button
              type="button"
              key={page}
              aria-label={`Mostrar página ${page + 1} de ${pageCount}`}
              aria-current={pageIndex === page ? "page" : undefined}
              className={pageIndex === page ? "is-active" : ""}
              onClick={() => setPageIndex(page)}
            />
          ))}
        </div>
      )}
      <Link className="text-link" to="/loja">
        Descubra as peças <ArrowRight size={16} />
      </Link>
    </section>
  );
}
