import { money } from "../../data";
import type {
  CheckoutAddress,
  CheckoutDraft,
  CheckoutLine,
  CheckoutPaymentMethod,
} from "./checkoutModel";

type CheckoutSummaryProps = {
  draft: CheckoutDraft;
  lines: CheckoutLine[];
  subtotalCents: number;
  paymentMethod: CheckoutPaymentMethod;
  installments: number;
  cardTotalCents: number;
  paymentTotalCents: number;
};

function formatAddress(address: CheckoutAddress) {
  return [
    [address.street, address.number].filter(Boolean).join(", "),
    address.complement,
    address.neighborhood,
    [address.city, address.state].filter(Boolean).join(" / "),
    address.postalCode ? `CEP ${address.postalCode}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function CheckoutSummary({
  draft,
  lines,
  subtotalCents,
  paymentMethod,
  installments,
  cardTotalCents,
  paymentTotalCents,
}: CheckoutSummaryProps) {
  const addressSummary = formatAddress(draft.address);
  const isCustomOrder = lines.some((line) => Boolean(line.customQuoteId));
  const paymentLabel =
    paymentMethod === "pix"
      ? "Pix ilustrativo"
      : `Cartão de ${paymentMethod === "credit_card" ? "crédito" : "débito"}`;

  return (
    <aside className="checkout-summary">
      <h2>Resumo do pedido</h2>
      <ul>
        {lines.map(
          ({
            product,
            basketItemId,
            displayName,
            categoryName,
            customDescription,
            quantity,
            colorName,
            isNecklace,
            unitPriceCents,
          }) => (
            <li key={basketItemId}>
              <span>
                {product?.name || displayName || "Peça indisponível"}{" "}
                <small>× {quantity}</small>
                {categoryName && (
                  <small className="checkout-line-options">
                    Tipo de peça: {categoryName}
                  </small>
                )}
                {customDescription && (
                  <small className="checkout-line-options">
                    {customDescription}
                  </small>
                )}
                {colorName && (
                  <small className="checkout-line-options">
                    Cor: {colorName}
                  </small>
                )}
                {isNecklace && (
                  <small className="checkout-line-options">
                    Corrente incluída
                  </small>
                )}
              </span>
              <strong>{money(unitPriceCents * quantity)}</strong>
            </li>
          ),
        )}
      </ul>
      <div className="checkout-summary-line">
        <span>Peças</span>
        <strong>{money(subtotalCents)}</strong>
      </div>
      <div className="checkout-summary-line">
        <span>
          {draft.deliveryMethod === "pickup" ? "Retirada presencial" : "Sedex"}
        </span>
        <strong>
          {draft.deliveryMethod === "pickup" ? "Sem frete" : "A combinar"}
        </strong>
      </div>
      {draft.deliveryMethod === "sedex" && (
        <div className="checkout-summary-address">
          <strong>Endereço de entrega</strong>
          <span>
            {addressSummary || "Preencha o endereço na etapa de entrega."}
          </span>
        </div>
      )}
      <div className="checkout-summary-address">
        <strong>Contato</strong>
        <span>
          {[draft.contact.name, draft.contact.email, draft.contact.phone]
            .filter(Boolean)
            .join(" · ") || "Preencha seus dados de contato."}
        </span>
      </div>
      {draft.isGift && (
        <div className="checkout-summary-address">
          <strong>Compra para presente</strong>
          <span>{draft.giftMessage.trim() || "Sem mensagem para o cartão."}</span>
        </div>
      )}
      {draft.step === 2 &&
        paymentMethod === "credit_card" &&
        installments > 1 && (
          <div className="checkout-summary-line">
            <span>Juros ilustrativos</span>
            <strong>{money(cardTotalCents - subtotalCents)}</strong>
          </div>
        )}
      <div className="checkout-summary-total">
        <span>{draft.step === 2 ? paymentLabel : "Total da simulação"}</span>
        <strong>
          {money(draft.step === 2 ? paymentTotalCents : subtotalCents)}
        </strong>
      </div>
      {draft.step === 2 && paymentMethod === "credit_card" && (
        <p className="checkout-installment-preview">
          {installments}x de{" "}
          {money(Math.ceil(paymentTotalCents / installments))}
          {installments > 1 ? " · inclui juros ilustrativos" : " · sem juros"}
        </p>
      )}
      <p className="checkout-summary-note">
        {draft.deliveryMethod === "sedex"
          ? "O frete dos Correios ainda não foi calculado e não está incluído no total desta demonstração."
          : "A retirada depende de combinação prévia com a artesã pelo chat."}
      </p>
      <p className="checkout-summary-note">
        O pedido de teste e os dados de entrega ficam no Firebase. Nenhum dado
        de cartão é enviado ou armazenado.
        {isCustomOrder
          ? " A encomenda personalizada não altera o estoque do catálogo."
          : " O estoque fica reservado até o cancelamento do pedido."}
      </p>
    </aside>
  );
}
