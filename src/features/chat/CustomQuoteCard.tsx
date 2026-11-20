import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../app/contexts";
import { acceptCustomQuote, money, type CustomQuote } from "../../data";

export function CustomQuoteCard({
  quote,
  conversationId,
  customerId,
  isAdmin,
}: {
  quote: CustomQuote;
  conversationId: string;
  customerId: string;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const notify = useToast();
  const [selectedColorId, setSelectedColorId] = useState(
    quote.selectedColorId || quote.colorIds?.[0] || "",
  );
  const [withChain, setWithChain] = useState(quote.withChain === true);
  const [busy, setBusy] = useState(false);
  const colorIds = quote.colorIds || [];
  const hasChainOption = Number.isSafeInteger(quote.chainAddonPriceCents);
  const selectedColorName = selectedColorId
    ? quote.colorNames?.[selectedColorId]
    : "";
  const unitPriceCents =
    quote.basePriceCents +
    (withChain && hasChainOption ? quote.chainAddonPriceCents || 0 : 0);
  const checkoutPath = `/checkout?customQuote=${encodeURIComponent(quote.id)}&conversation=${encodeURIComponent(conversationId)}`;

  useEffect(() => {
    setSelectedColorId(quote.selectedColorId || quote.colorIds?.[0] || "");
  }, [quote.id, quote.selectedColorId]);
  useEffect(() => {
    setWithChain(quote.withChain === true);
  }, [quote.id, quote.withChain]);

  async function acceptOffer() {
    if (busy) return;
    if (colorIds.length && !selectedColorId) {
      notify("Escolha uma das cores da proposta.", "warning");
      return;
    }
    setBusy(true);
    try {
      await acceptCustomQuote(
        conversationId,
        quote.id,
        customerId,
        selectedColorId,
        withChain,
      );
      navigate(checkoutPath);
    } catch (cause) {
      if (import.meta.env.DEV)
        console.error("Custom quote acceptance failed", cause);
      const errorCode =
        cause instanceof Error ? cause.message : "custom-quote-error";
      notify(
        errorCode === "custom-quote-no-longer-available"
          ? "Esta proposta já foi respondida ou não está mais disponível."
          : "Não foi possível aceitar a proposta. Atualize o chat e tente novamente.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="custom-quote-card">
      <div className="custom-quote-card-heading">
        <span className="eyebrow">PROPOSTA PERSONALIZADA</span>
        <span className={`custom-quote-status status-${quote.status}`}>
          {quote.status === "offered"
            ? "Aguardando resposta"
            : quote.status === "accepted"
              ? "Aceita"
              : "Pedido criado"}
        </span>
      </div>
      <h3>{quote.title}</h3>
      <p className="custom-quote-type">Tipo de peça · {quote.categoryName}</p>
      <p className="custom-quote-description">{quote.description}</p>

      {quote.status === "offered" && !isAdmin && colorIds.length > 0 && (
        <fieldset className="custom-quote-choice-group">
          <legend>Escolha a cor</legend>
          {colorIds.map((colorId) => (
            <label key={colorId}>
              <input
                type="radio"
                name={`custom-color-${quote.id}`}
                checked={selectedColorId === colorId}
                onChange={() => setSelectedColorId(colorId)}
              />
              {quote.colorNames?.[colorId] || "Cor"}
            </label>
          ))}
        </fieldset>
      )}
      {quote.status !== "offered" && selectedColorName && (
        <p className="custom-quote-selected">
          Cor escolhida · <strong>{selectedColorName}</strong>
        </p>
      )}

      {hasChainOption && (
        <fieldset className="custom-quote-choice-group">
          <legend>Como prefere receber?</legend>
          {quote.status === "offered" && !isAdmin ? (
            <>
              <label>
                <input
                  type="radio"
                  name={`custom-chain-${quote.id}`}
                  checked={!withChain}
                  onChange={() => setWithChain(false)}
                />
                Somente o pingente
                <strong>{money(quote.basePriceCents)}</strong>
              </label>
              <label>
                <input
                  type="radio"
                  name={`custom-chain-${quote.id}`}
                  checked={withChain}
                  onChange={() => setWithChain(true)}
                />
                Com corrente
                <strong>
                  {money(
                    quote.basePriceCents + (quote.chainAddonPriceCents || 0),
                  )}
                </strong>
              </label>
            </>
          ) : quote.status === "offered" && isAdmin ? (
            <>
              <p>
                Somente o pingente ·{" "}
                <strong>{money(quote.basePriceCents)}</strong>
              </p>
              <p>
                Com corrente ·{" "}
                <strong>
                  {money(
                    quote.basePriceCents + (quote.chainAddonPriceCents || 0),
                  )}
                </strong>
              </p>
            </>
          ) : (
            <p>
              {quote.withChain ? "Com corrente" : "Somente o pingente"} ·{" "}
              <strong>{money(unitPriceCents)}</strong>
            </p>
          )}
        </fieldset>
      )}

      {!hasChainOption && (
        <div className="custom-quote-price-row">
          <span>Preço da peça</span>
          <strong>{money(quote.basePriceCents)}</strong>
        </div>
      )}
      {hasChainOption && quote.status === "offered" && !isAdmin && (
        <div className="custom-quote-price-row custom-quote-total-preview">
          <span>Total da opção escolhida</span>
          <strong>{money(unitPriceCents)}</strong>
        </div>
      )}
      {hasChainOption && quote.status !== "offered" && (
        <div className="custom-quote-price-row">
          <span>Preço da opção escolhida</span>
          <strong>{money(unitPriceCents)}</strong>
        </div>
      )}

      {quote.status === "offered" && !isAdmin && (
        <button
          className="button custom-quote-accept"
          type="button"
          disabled={busy || (colorIds.length > 0 && !selectedColorId)}
          onClick={acceptOffer}
        >
          {busy ? "Salvando escolha…" : "Aceitar e continuar para o checkout"}
          {!busy && <ArrowRight size={17} />}
        </button>
      )}
      {quote.status === "accepted" && !isAdmin && (
        <button
          className="button custom-quote-accept"
          type="button"
          onClick={() => navigate(checkoutPath)}
        >
          <Check size={17} /> Continuar para o checkout
        </button>
      )}
      {quote.status === "ordered" && quote.orderId && (
        <p className="custom-quote-order-note">
          Esta proposta está vinculada ao pedido {quote.orderId}.
        </p>
      )}
    </article>
  );
}
