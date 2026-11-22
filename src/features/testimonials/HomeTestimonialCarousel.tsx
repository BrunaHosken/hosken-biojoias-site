import { useEffect, useMemo, useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import {
  useFeaturedTestimonials,
  useHomepageTestimonialSettings,
} from "../../data";

function formatDate(value?: { toDate: () => Date }) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    value.toDate(),
  );
}

export function HomeTestimonialCarousel() {
  const featured = useFeaturedTestimonials();
  const settings = useHomepageTestimonialSettings();
  const testimonials = useMemo(
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

  const pageCount = Math.ceil(testimonials.length / visibleCount);
  const visible = testimonials.slice(
    pageIndex * visibleCount,
    pageIndex * visibleCount + visibleCount,
  );

  useEffect(() => setPageIndex(0), [visibleCount, settings.homepageLimit, featured.data]);
  useEffect(() => {
    if (pageCount < 2) return;
    const timer = window.setInterval(
      () => setPageIndex((current) => (current + 1) % pageCount),
      7200,
    );
    return () => window.clearInterval(timer);
  }, [pageCount, pageIndex]);

  if (featured.loading || !testimonials.length) return null;

  return (
    <section className="home-testimonial-section" aria-labelledby="home-testimonials-title">
      <div className="section-title">
        <div>
          <div className="eyebrow">PALAVRAS QUE FICAM</div>
          <h2 id="home-testimonials-title">Histórias do nosso ateliê</h2>
        </div>
      </div>
      <div className="home-testimonial-grid" key={pageIndex}>
        {visible.map((testimonial) => (
          <article className="home-testimonial-card" key={testimonial.id}>
            <header>
              <MessageSquareQuote size={21} aria-hidden="true" />
              {formatDate(testimonial.createdAt) && (
                <time>{formatDate(testimonial.createdAt)}</time>
              )}
            </header>
            <div className="home-testimonial-text">
              <p>{testimonial.text}</p>
            </div>
            <footer>
              {testimonial.anonymous
                ? "Cliente anônimo"
                : testimonial.displayName || "Cliente da Hosken Biojoias"}
            </footer>
          </article>
        ))}
      </div>
      {pageCount > 1 && (
        <div
          className="home-testimonial-pagination"
          role="group"
          aria-label="Páginas de depoimentos"
        >
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
    </section>
  );
}
