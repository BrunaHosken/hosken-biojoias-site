import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  MapPin,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { FaqAnswerModal } from "../../components/FaqAnswerModal";
import { useRecords, type Content } from "../../data";
import { rankFaqs } from "../storefront/faqSearch";

export type ChatIntakeTopic =
  "question" | "order" | "exchange" | "custom" | "pickup" | "other" | "product";

type IntakeTopic = Exclude<ChatIntakeTopic, "product">;

const topicOptions: {
  id: IntakeTopic;
  label: string;
  description: string;
  query: string | null;
  icon: typeof CircleHelp;
}[] = [
  {
    id: "question",
    label: "Tenho uma dúvida",
    description: "Sobre as peças ou a loja.",
    query: "",
    icon: CircleHelp,
  },
  {
    id: "order",
    label: "Pedido ou entrega",
    description: "Acompanhar uma compra ou tirar dúvida sobre envio.",
    query: "pedido compra entrega envio correios pagamento rastreamento frete",
    icon: PackageCheck,
  },
  {
    id: "exchange",
    label: "Troca ou devolução",
    description: "Consultar a política e os próximos passos.",
    query: "troca trocar devolver devolução cancelamento reembolso",
    icon: RefreshCw,
  },
  {
    id: "custom",
    label: "Peça personalizada",
    description: "Conte sua ideia e, se quiser, envie uma foto.",
    query: null,
    icon: Sparkles,
  },
  {
    id: "pickup",
    label: "Retirada presencial",
    description: "Combine dia, horário e local com a artesã.",
    query: null,
    icon: MapPin,
  },
  {
    id: "other",
    label: "Outro assunto",
    description: "Fale diretamente com a artesã.",
    query: null,
    icon: MessageCircle,
  },
];

const topicDrafts: Record<ChatIntakeTopic, string> = {
  question: "Olá! Tenho uma dúvida sobre as peças ou a loja.",
  order: "Olá! Preciso de ajuda com um pedido ou entrega.",
  exchange: "Olá! Gostaria de conversar sobre uma troca ou devolução.",
  custom:
    "Olá! Gostaria de encomendar uma peça personalizada. Vou explicar a ideia por aqui.",
  pickup: "Olá! Gostaria de combinar uma retirada presencial com a artesã.",
  other: "Olá! Gostaria de falar com a artesã sobre outro assunto.",
  product: "Olá! Tenho uma dúvida sobre esta peça.",
};

export function chatTopicDraft(topic: ChatIntakeTopic) {
  return topicDrafts[topic];
}

export function ChatStartFlow({
  onStart,
  onFinish,
  initialFollowup = false,
}: {
  onStart: (topic: IntakeTopic) => void;
  onFinish?: () => void;
  initialFollowup?: boolean;
}) {
  const faqs = useRecords<Content>("faqs");
  const [topic, setTopic] = useState<IntakeTopic | null>(null);
  const [selectedFaq, setSelectedFaq] = useState<Content | null>(null);
  const [answeredFaq, setAnsweredFaq] = useState(initialFollowup);
  const [finished, setFinished] = useState(false);
  const selectedTopic = topicOptions.find((item) => item.id === topic);
  const directTopic = selectedTopic?.query === null;
  const suggestions = useMemo(() => {
    if (!selectedTopic || selectedTopic.query === null) return [];
    if (!selectedTopic.query) return rankFaqs(faqs.data, "");
    return rankFaqs(faqs.data, selectedTopic.query, 3);
  }, [faqs.data, selectedTopic]);

  if (finished) {
    return (
      <section className="chat-intake chat-intake-thanks" aria-live="polite">
        <span className="eyebrow">ATENDIMENTO HOSKEN BIOJOIAS</span>
        <h2>Obrigada por conversar com a gente.</h2>
        <p>Quando precisar, estaremos por aqui para ajudar.</p>
        <Link className="button secondary" to="/loja">
          Voltar à loja <ArrowRight size={17} />
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="chat-intake">
        <span className="eyebrow">ATENDIMENTO GUIADO</span>
        {!topic ? (
          <>
            <h2>Como podemos ajudar?</h2>
            <p>
              Escolha um assunto. Talvez já exista uma resposta pronta; se não,
              você pode falar com a artesã.
            </p>
            <div className="chat-intake-options">
              {topicOptions.map(({ id, label, description, icon: Icon }) => (
                <button
                  type="button"
                  className="chat-intake-option"
                  key={id}
                  onClick={() => {
                    if (
                      id === "custom" ||
                      id === "pickup" ||
                      id === "other"
                    ) {
                      onStart(id);
                      return;
                    }
                    setTopic(id);
                    setAnsweredFaq(false);
                  }}
                >
                  <Icon size={21} aria-hidden="true" />
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        ) : answeredFaq ? (
          <>
            <h2>Precisa de mais alguma coisa?</h2>
            <p>Você pode escolher outro assunto ou conversar com a artesã.</p>
            <div className="chat-intake-followup">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setTopic(null);
                  setAnsweredFaq(false);
                }}
              >
                Sim, preciso de mais ajuda <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  setFinished(true);
                  onFinish?.();
                }}
              >
                Não, obrigada
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => onStart(topic)}
              >
                Ainda preciso falar com a artesã
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              className="chat-intake-back"
              type="button"
              onClick={() => setTopic(null)}
            >
              <ArrowLeft size={16} /> Voltar aos assuntos
            </button>
            <h2>{selectedTopic?.label}</h2>
            <p>Veja se alguma destas respostas resolve sua dúvida.</p>
            {!directTopic && faqs.loading && (
              <p role="status">Procurando respostas publicadas…</p>
            )}
            {!directTopic && faqs.error && (
              <p className="notice" role="status">
                Não foi possível carregar as respostas agora. Você ainda pode
                falar com a artesã.
              </p>
            )}
            {!directTopic &&
              !faqs.loading &&
              !faqs.error &&
              suggestions.length > 0 && (
              <div className="chat-intake-faqs">
                {suggestions.map((faq) => (
                  <button
                    type="button"
                    className="chat-intake-faq"
                    key={faq.id}
                    onClick={() => setSelectedFaq(faq)}
                  >
                    <span>{faq.title}</span>
                    {faq.category && <small>{faq.category}</small>}
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            {directTopic && (
              <p className="chat-intake-no-faq">
                Este assunto vai direto para a artesã. Escreva sua mensagem no
                chat para explicar como ela pode ajudar.
              </p>
            )}
            {!directTopic &&
              !faqs.loading &&
              !faqs.error &&
              suggestions.length === 0 && (
              <p className="chat-intake-no-faq">
                Ainda não temos uma resposta cadastrada para esse assunto. A
                artesã pode ajudar você pelo chat.
              </p>
            )}
            <div className="chat-intake-continue">
              <button
                type="button"
                className="button"
                onClick={() => onStart(topic)}
              >
                <MessageCircle size={17} /> Falar com a artesã
              </button>
              <small>
                {suggestions.length > 0
                  ? "Se a resposta não resolver, continuamos por aqui."
                  : "Sua mensagem começará com esse assunto selecionado."}
              </small>
            </div>
          </>
        )}
      </section>
      {selectedFaq && (
        <FaqAnswerModal
          faq={selectedFaq}
          onClose={() => {
            setSelectedFaq(null);
            setAnsweredFaq(true);
          }}
        />
      )}
    </>
  );
}
