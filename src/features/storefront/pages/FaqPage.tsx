import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import { Notice } from "../../../components/Feedback";
import { FaqAnswerModal } from "../../../components/FaqAnswerModal";
import { useRecords, type Content } from "../../../data";
import { rankFaqs } from "../faqSearch";

export function FaqPage() {
  const faqs = useRecords<Content>("faqs");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [selectedFaq, setSelectedFaq] = useState<Content | null>(null);
  const categories = useMemo(() => {
    const values = new Set<string>();
    faqs.data.forEach((faq) => {
      const value = faq.category?.trim();
      if (value) values.add(value);
    });
    return [...values];
  }, [faqs.data]);
  const displayedFaqs = useMemo(
    () =>
      rankFaqs(faqs.data, query).filter(
        (faq) => category === "Todas" || faq.category === category,
      ),
    [category, faqs.data, query],
  );

  return (
    <div className="page faq-page">
      <div className="eyebrow">AJUDA DO ATELIÊ</div>
      <h1>Perguntas frequentes</h1>
      <p className="lead">
        Encontre respostas sobre as peças, os pedidos e o funcionamento da loja.
      </p>

      <label className="faq-search">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Buscar uma dúvida</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Digite sua dúvida ou algumas palavras…"
        />
      </label>

      {categories.length > 0 && (
        <nav
          className="faq-categories"
          aria-label="Filtrar perguntas por categoria"
        >
          {["Todas", ...categories].map((item) => (
            <button
              className={category === item ? "selected" : ""}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </nav>
      )}

      <Notice {...faqs} />
      {!faqs.loading && faqs.data.length > 0 && (
        <p className="faq-result-count" aria-live="polite">
          {query.trim()
            ? `${displayedFaqs.length} ${displayedFaqs.length === 1 ? "resposta encontrada" : "respostas encontradas"}`
            : `${displayedFaqs.length} ${displayedFaqs.length === 1 ? "pergunta" : "perguntas"}`}
        </p>
      )}
      <section className="faq-list" aria-label="Respostas frequentes">
        {displayedFaqs.map((faq) => (
          <article className="faq-item" key={faq.id}>
            <button
              className="faq-question"
              type="button"
              onClick={() => setSelectedFaq(faq)}
              aria-label={`Abrir resposta: ${faq.title}`}
            >
              <span>{faq.title}</span>
              {faq.category && <small>{faq.category}</small>}
              <ArrowUpRight size={19} aria-hidden="true" />
            </button>
          </article>
        ))}
      </section>

      {selectedFaq && (
        <FaqAnswerModal
          key={selectedFaq.id}
          faq={selectedFaq}
          onClose={() => setSelectedFaq(null)}
        />
      )}

      {!faqs.loading && !faqs.error && !faqs.data.length && (
        <div className="empty faq-empty">
          <h2>Estamos preparando esta página.</h2>
          <p>
            As respostas aparecerão aqui assim que forem publicadas pelo ateliê.
          </p>
          <Link className="button secondary" to="/contato">
            Fale com o ateliê
          </Link>
        </div>
      )}
      {!faqs.loading &&
        !faqs.error &&
        faqs.data.length > 0 &&
        !displayedFaqs.length && (
          <div className="empty faq-empty">
            <h2>Não encontramos uma resposta com esses termos.</h2>
            <p>Tente outras palavras ou fale diretamente com o ateliê.</p>
            <Link className="button secondary" to="/contato">
              Fale com o ateliê
            </Link>
          </div>
        )}
    </div>
  );
}
