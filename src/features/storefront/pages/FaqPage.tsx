import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search, X } from "lucide-react";
import { Notice } from "../../../components/Feedback";
import { useRecords, type Content } from "../../../data";

const stopWords = new Set([
  "a",
  "as",
  "o",
  "os",
  "um",
  "uma",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "para",
  "por",
  "com",
  "e",
  "ou",
  "que",
  "qual",
  "quais",
  "como",
  "quando",
  "onde",
  "meu",
  "minha",
  "posso",
  "consigo",
  "faz",
  "fazer",
  "tem",
  "ter",
  "ser",
  "ao",
  "aos",
]);

const relatedTerms: Record<string, string[]> = {
  envio: ["entrega", "sedex", "correios", "frete", "postagem"],
  entrega: ["envio", "sedex", "correios", "frete", "postagem"],
  sedex: ["envio", "entrega", "correios", "frete", "postagem"],
  correios: ["envio", "entrega", "sedex", "frete", "postagem"],
  retirada: ["presencial", "buscar", "encontro", "atendimento"],
  presencial: ["retirada", "buscar", "encontro", "atendimento"],
  personalizada: ["customizada", "encomenda", "encomendar", "sob medida"],
  customizada: ["personalizada", "encomenda", "encomendar", "sob medida"],
  encomenda: ["personalizada", "customizada", "encomendar", "sob medida"],
  compra: ["pedido", "carrinho", "sacola", "checkout"],
  pedido: ["compra", "carrinho", "sacola", "checkout"],
  pagamento: ["pagar", "pix", "cartao", "debito", "credito"],
  pagar: ["pagamento", "pix", "cartao", "debito", "credito"],
  cartao: ["pagamento", "debito", "credito"],
  pix: ["pagamento", "pagar"],
  preco: ["valor", "custo", "custa"],
  valor: ["preco", "custo", "custa"],
  cancelar: ["cancelamento", "desistir", "reembolso"],
  cancelamento: ["cancelar", "desistir", "reembolso"],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreFaq(faq: Content, query: string) {
  const normalizedQuery = normalize(query);
  const directTerms = normalizedQuery
    .split(/\s+/)
    .filter((term) => term.length > 1 && !stopWords.has(term));
  if (!directTerms.length) return 1;

  const terms = new Map<string, number>();
  directTerms.forEach((term) => terms.set(term, 3));
  directTerms.forEach((term) =>
    (relatedTerms[term] || []).forEach((related) => {
      normalize(related)
        .split(" ")
        .forEach((relatedTerm) => {
          if (!terms.has(relatedTerm)) terms.set(relatedTerm, 1);
        });
    }),
  );

  const question = normalize(faq.title);
  const answer = normalize(faq.body);
  const category = normalize(faq.category || "");
  const keywords = normalize(faq.keywords || "");
  const fields = [
    { words: new Set(question.split(" ")), weight: 5 },
    { words: new Set(keywords.split(" ")), weight: 4 },
    { words: new Set(category.split(" ")), weight: 2 },
    { words: new Set(answer.split(" ")), weight: 1 },
  ];

  let score = 0;
  terms.forEach((termWeight, term) => {
    fields.forEach(({ words, weight }) => {
      if (words.has(term)) score += termWeight * weight;
      else if (
        term.length > 3 &&
        [...words].some((word) => word.startsWith(term))
      )
        score += termWeight * weight * 0.5;
    });
  });
  if (question.includes(normalizedQuery)) score += 10;
  else if (answer.includes(normalizedQuery)) score += 3;
  return score;
}

function FaqAnswerModal({
  faq,
  onClose,
}: {
  faq: Content;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const previouslyFocusedRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  return createPortal(
    <div
      className="faq-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="faq-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-modal-title"
      >
        <header className="faq-modal-header">
          <span className="eyebrow">{faq.category || "PERGUNTAS FREQUENTES"}</span>
          <button
            ref={closeButtonRef}
            className="faq-modal-close"
            type="button"
            aria-label="Fechar resposta"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="faq-modal-scroll">
          <h2 id="faq-modal-title">{faq.title}</h2>
          <div className="faq-answer">
            {(faq.body || "").split(/\n{2,}/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

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
  const displayedFaqs = useMemo(() => {
    const normalizedQuery = normalize(query);
    return faqs.data
      .map((faq) => ({ faq, score: normalizedQuery ? scoreFaq(faq, query) : 0 }))
      .filter(({ faq, score }) =>
        (category === "Todas" || faq.category === category) &&
        (!normalizedQuery || score > 0),
      )
      .sort((a, b) =>
        normalizedQuery
          ? b.score - a.score || a.faq.title.localeCompare(b.faq.title)
          : a.faq.title.localeCompare(b.faq.title),
      )
      .map(({ faq }) => faq);
  }, [category, faqs.data, query]);

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
