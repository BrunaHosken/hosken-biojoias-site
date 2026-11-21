import type { Content } from "../../data";

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
  troca: ["trocar", "devolucao", "defeito"],
  trocar: ["troca", "devolucao", "defeito"],
  devolucao: ["troca", "trocar", "cancelamento"],
};

const faqIntentTerms = {
  order: [
    "pedido",
    "pedidos",
    "compra",
    "compras",
    "entrega",
    "entregas",
    "envio",
    "envios",
    "frete",
    "correios",
    "sedex",
    "rastreio",
    "rastreamento",
    "pagamento",
    "pagamentos",
    "pix",
    "debito",
    "credito",
    "prazo",
    "reenvio",
  ],
  exchange: [
    "troca",
    "trocas",
    "trocar",
    "devolucao",
    "devolucoes",
    "devolver",
    "cancelamento",
    "cancelamentos",
    "cancelar",
    "reembolso",
    "reembolsos",
    "estorno",
    "defeito",
    "defeitos",
  ],
} as const;

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

  const question = normalize(faq.title || "");
  const answer = normalize(faq.body || "");
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
      ) {
        score += termWeight * weight * 0.5;
      }
    });
  });
  if (question.includes(normalizedQuery)) score += 10;
  else if (answer.includes(normalizedQuery)) score += 3;
  return score;
}

export function rankFaqs(
  faqs: Content[],
  query: string,
  minimumScore = 0,
) {
  const normalizedQuery = normalize(query);
  return faqs
    .map((faq) => ({ faq, score: normalizedQuery ? scoreFaq(faq, query) : 0 }))
    .filter(({ score }) =>
      normalizedQuery ? score >= Math.max(1, minimumScore) : true,
    )
    .sort((a, b) =>
      normalizedQuery
        ? b.score - a.score || a.faq.title.localeCompare(b.faq.title)
        : a.faq.title.localeCompare(b.faq.title),
    )
    .map(({ faq }) => faq);
}

export function rankFaqsForChatTopic(
  faqs: Content[],
  query: string,
  intent: keyof typeof faqIntentTerms,
  limit = 3,
) {
  const competingIntent = intent === "order" ? "exchange" : "order";
  const candidates = faqs.filter((faq) => {
    const titleAndCategory = normalize(`${faq.title} ${faq.category || ""}`);
    const searchableMetadata = normalize(
      `${titleAndCategory} ${faq.keywords || ""}`,
    );
    const hasRequestedIntent = faqIntentTerms[intent].some((term) =>
      searchableMetadata.split(" ").includes(term),
    );
    const hasCompetingIntent = faqIntentTerms[competingIntent].some((term) =>
      titleAndCategory.split(" ").includes(term),
    );
    return hasRequestedIntent && !hasCompetingIntent;
  });

  return rankFaqs(candidates, query, 3).slice(0, limit);
}
