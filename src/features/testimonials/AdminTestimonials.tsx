import { useEffect, useMemo, useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import { useToast } from "../../app/contexts";
import { Pagination } from "../../components/Pagination";
import {
  setHomepageTestimonialLimit,
  setTestimonialFeatured,
  useAdminTestimonials,
  useHomepageTestimonialSettings,
  type Testimonial,
} from "../../data";

const TESTIMONIALS_PER_PAGE = 10;

function formatTestimonialDate(testimonial: Testimonial) {
  if (!testimonial.createdAt) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    testimonial.createdAt.toDate(),
  );
}

export function AdminTestimonials() {
  const testimonials = useAdminTestimonials();
  const homepageSettings = useHomepageTestimonialSettings();
  const notify = useToast();
  const [homepageLimitDraft, setHomepageLimitDraft] = useState("5");
  const [savingLimit, setSavingLimit] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setHomepageLimitDraft(String(homepageSettings.homepageLimit));
  }, [homepageSettings.homepageLimit]);

  const sortedTestimonials = useMemo(
    () =>
      [...testimonials.data].sort(
        (a, b) =>
          (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
      ),
    [testimonials.data],
  );
  const featuredCount = testimonials.data.filter(
    (testimonial) => testimonial.featuredHome,
  ).length;
  const pageCount = Math.max(
    1,
    Math.ceil(sortedTestimonials.length / TESTIMONIALS_PER_PAGE),
  );
  const safePage = Math.min(page, pageCount);
  const visibleTestimonials = sortedTestimonials.slice(
    (safePage - 1) * TESTIMONIALS_PER_PAGE,
    safePage * TESTIMONIALS_PER_PAGE,
  );

  async function saveHomepageLimit() {
    const nextLimit = Number(homepageLimitDraft);
    if (!Number.isInteger(nextLimit) || nextLimit < 1 || nextLimit > 30) {
      notify("Escolha um limite entre 1 e 30 depoimentos.", "error");
      return;
    }
    if (nextLimit < featuredCount) {
      notify(
        "Remova alguns destaques da página inicial antes de reduzir esse limite.",
        "error",
      );
      return;
    }
    setSavingLimit(true);
    try {
      await setHomepageTestimonialLimit(nextLimit);
      notify("Limite de depoimentos atualizado.", "success");
    } catch {
      notify("Não foi possível atualizar o limite de depoimentos.", "error");
    } finally {
      setSavingLimit(false);
    }
  }

  async function toggleFeatured(testimonial: Testimonial) {
    setBusyId(testimonial.id);
    try {
      await setTestimonialFeatured(testimonial.id, !testimonial.featuredHome);
      notify(
        testimonial.featuredHome
          ? "Depoimento removido da página inicial."
          : "Depoimento destacado na página inicial.",
        "success",
      );
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "";
      notify(
        message.includes("homepage-testimonial-limit")
          ? `A página inicial comporta até ${homepageSettings.homepageLimit} depoimentos em destaque. Remova um antes de destacar outro.`
          : "Não foi possível atualizar este depoimento.",
        "error",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="admin-testimonials">
      <div className="review-section-heading">
        <div>
          <div className="eyebrow">HISTÓRIAS COMPARTILHADAS COM O ATELIÊ</div>
          <h2>Depoimentos</h2>
          <p>
            Clientes podem enviar um depoimento sem ter feito uma compra. Só os
            que você destacar aparecem publicamente.
          </p>
        </div>
      </div>

      <div className="review-admin-stats testimonial-admin-stats">
        <article>
          <strong>{testimonials.data.length}</strong>
          <span>Depoimentos recebidos</span>
        </article>
        <article>
          <strong>
            {featuredCount}/{homepageSettings.homepageLimit}
          </strong>
          <span>Em destaque na página inicial</span>
        </article>
      </div>

      <div className="homepage-review-limit homepage-testimonial-limit">
        <label htmlFor="homepage-testimonial-limit">
          Máximo de depoimentos em destaque
        </label>
        <div>
          <input
            id="homepage-testimonial-limit"
            type="number"
            min="1"
            max="30"
            step="1"
            value={homepageLimitDraft}
            onChange={(event) => setHomepageLimitDraft(event.target.value)}
          />
          <button
            className="button secondary"
            type="button"
            disabled={savingLimit || homepageSettings.loading}
            onClick={() => void saveHomepageLimit()}
          >
            {savingLimit ? "Salvando…" : "Salvar limite"}
          </button>
        </div>
        <small>Escolha de 1 a 30. O carrossel mostra até três por vez.</small>
        {homepageSettings.error && (
          <small role="alert">{homepageSettings.error}</small>
        )}
      </div>

      {testimonials.loading && <p role="status">Carregando depoimentos…</p>}
      {testimonials.error && (
        <p className="notice" role="alert">
          {testimonials.error}
        </p>
      )}
      {!testimonials.loading &&
        !testimonials.error &&
        sortedTestimonials.length === 0 && (
          <div className="empty">
            <h3>Ainda não há depoimentos</h3>
            <p>Os depoimentos enviados pelos clientes aparecerão aqui.</p>
          </div>
        )}

      {sortedTestimonials.length > 0 && (
        <p className="muted admin-review-result-count">
          Mostrando {Math.min((safePage - 1) * TESTIMONIALS_PER_PAGE + 1, sortedTestimonials.length)}–
          {Math.min(safePage * TESTIMONIALS_PER_PAGE, sortedTestimonials.length)} de {sortedTestimonials.length} depoimentos.
        </p>
      )}

      <div className="admin-testimonial-list">
        {visibleTestimonials.map((testimonial) => (
          <article className="admin-testimonial-card" key={testimonial.id}>
            <header>
              <span className="testimonial-quote-icon" aria-hidden="true">
                <MessageSquareQuote size={19} />
              </span>
              <time>{formatTestimonialDate(testimonial)}</time>
              <span>
                {testimonial.anonymous
                  ? "Anônimo"
                  : testimonial.customerName || testimonial.displayName || "Cliente"}
              </span>
            </header>
            <p>{testimonial.text}</p>
            <button
              className="button secondary"
              type="button"
              disabled={
                busyId === testimonial.id ||
                (!testimonial.featuredHome && featuredCount >= homepageSettings.homepageLimit)
              }
              onClick={() => void toggleFeatured(testimonial)}
            >
              {busyId === testimonial.id
                ? "Salvando…"
                : testimonial.featuredHome
                  ? "Remover da página inicial"
                  : "Destacar na página inicial"}
            </button>
          </article>
        ))}
      </div>
      <Pagination
        page={safePage}
        pageCount={pageCount}
        onChange={setPage}
        label="Paginação de depoimentos"
      />
    </section>
  );
}
