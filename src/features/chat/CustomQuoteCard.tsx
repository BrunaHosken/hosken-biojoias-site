import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../app/contexts";
import { acceptCustomQuote, money, type CustomQuote } from "../../data";
import { ImageLightbox } from "../../components/ImageLightbox";

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
  const [busy, setBusy] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const colorIds = quote.colorIds || [];
  const selectedColorName = selectedColorId
    ? quote.colorNames?.[selectedColorId]
    : "";
  const unitPriceCents =
    quote.basePriceCents + (quote.chainAddonPriceCents || 0);
  const checkoutPath = `/checkout?customQuote=${encodeURIComponent(quote.id)}&conversation=${encodeURIComponent(conversationId)}`;

  useEffect(() => {
    setSelectedColorId(quote.selectedColorId || quote.colorIds?.[0] || "");
  }, [quote.id, quote.selectedColorId]);

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
      {quote.imageUrls?.length ? (
        <div className="custom-quote-gallery" aria-label="Fotos da proposta">
          {quote.imageUrls.map((imageUrl, index) => (
            <button
              key={quote.imagePaths?.[index] || imageUrl}
              type="button"
              aria-label={`Abrir foto ${index + 1} da proposta`}
              onClick={() => setLightboxImage(imageUrl)}
            >
              <img src={imageUrl} alt={`Foto ${index + 1} da proposta`} />
            </button>
          ))}
        </div>
      ) : null}

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

      <div className="custom-quote-price-row">
        <span>Preço total da peça</span>
        <strong>{money(unitPriceCents)}</strong>
      </div>

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
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt={`Foto da proposta ${quote.title}`}
          onClose={() => setLightboxImage("")}
        />
      )}
    </article>
  );
}
