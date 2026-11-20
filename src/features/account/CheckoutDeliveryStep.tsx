import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import type {
  CheckoutAddress,
  CheckoutContact,
  CheckoutDraft,
} from "./checkoutModel";

type CheckoutDeliveryStepProps = {
  draft: CheckoutDraft;
  setDraft: Dispatch<SetStateAction<CheckoutDraft>>;
  cartIsValid: boolean;
  onUpdateContact: (field: keyof CheckoutContact, value: string) => void;
  onUpdateAddress: (field: keyof CheckoutAddress, value: string) => void;
  onContinue: (event: FormEvent<HTMLFormElement>) => void;
};

export function CheckoutDeliveryStep({
  draft,
  setDraft,
  cartIsValid,
  onUpdateContact,
  onUpdateAddress,
  onContinue,
}: CheckoutDeliveryStepProps) {
  return (
    <form className="checkout-card" onSubmit={onContinue}>
      <div className="checkout-section-heading">
        <span className="eyebrow">ETAPA 1</span>
        <h2>Como você quer receber?</h2>
      </div>
      <div className="checkout-delivery-options">
        <label
          className={`checkout-option ${draft.deliveryMethod === "sedex" ? "is-selected" : ""}`}
        >
          <input
            type="radio"
            name="deliveryMethod"
            value="sedex"
            checked={draft.deliveryMethod === "sedex"}
            onChange={() =>
              setDraft((current) => ({
                ...current,
                deliveryMethod: "sedex",
              }))
            }
          />
          <span>
            <strong>Receber pelos Correios (Sedex)</strong>
            <small>
              O valor do frete ainda será combinado; ele não está incluído nesta
              simulação.
            </small>
          </span>
        </label>
        <label
          className={`checkout-option ${draft.deliveryMethod === "pickup" ? "is-selected" : ""}`}
        >
          <input
            type="radio"
            name="deliveryMethod"
            value="pickup"
            checked={draft.deliveryMethod === "pickup"}
            onChange={() =>
              setDraft((current) => ({
                ...current,
                deliveryMethod: "pickup",
                pickupAgreed: false,
              }))
            }
          />
          <span>
            <strong>Retirar presencialmente</strong>
            <small>
              É preciso combinar data, horário e local diretamente com a artesã
              pelo chat.
            </small>
          </span>
        </label>
      </div>

      {draft.deliveryMethod === "pickup" && (
        <div className="checkout-pickup-note">
          <p>
            Abra uma conversa com a artesã para marcar a retirada. Depois de
            combinar, volte aqui e confirme para liberar o pagamento.
          </p>
          <Link className="button secondary" to="/chat?voltar=checkout">
            <MessageCircle size={17} /> Abrir chat para combinar
          </Link>
          <label className="checkout-checkbox">
            <input
              type="checkbox"
              checked={draft.pickupAgreed}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  pickupAgreed: event.target.checked,
                }))
              }
            />
            Já combinei a retirada com a artesã.
          </label>
        </div>
      )}

      {draft.deliveryMethod === "sedex" && (
        <div className="checkout-address-fields">
          <h3>Endereço para entrega</h3>
          <div className="checkout-field-pair">
            <label>
              CEP
              <input
                required
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[0-9]{5}-?[0-9]{3}"
                title="Digite um CEP com 8 números."
                maxLength={9}
                placeholder="28610-990"
                value={draft.address.postalCode}
                onChange={(event) =>
                  onUpdateAddress("postalCode", event.target.value)
                }
              />
            </label>
            <label>
              Estado
              <input
                required
                autoComplete="address-level1"
                maxLength={2}
                placeholder="RJ"
                value={draft.address.state}
                onChange={(event) =>
                  onUpdateAddress("state", event.target.value.toUpperCase())
                }
              />
            </label>
          </div>
          <label>
            Rua / avenida
            <input
              required
              autoComplete="address-line1"
              maxLength={160}
              value={draft.address.street}
              onChange={(event) =>
                onUpdateAddress("street", event.target.value)
              }
            />
          </label>
          <div className="checkout-field-pair">
            <label>
              Número
              <input
                required
                maxLength={20}
                value={draft.address.number}
                onChange={(event) =>
                  onUpdateAddress("number", event.target.value)
                }
              />
            </label>
            <label>
              Complemento (opcional)
              <input
                autoComplete="address-line2"
                maxLength={100}
                value={draft.address.complement}
                onChange={(event) =>
                  onUpdateAddress("complement", event.target.value)
                }
              />
            </label>
          </div>
          <div className="checkout-field-pair">
            <label>
              Bairro
              <input
                required
                autoComplete="address-level3"
                maxLength={100}
                value={draft.address.neighborhood}
                onChange={(event) =>
                  onUpdateAddress("neighborhood", event.target.value)
                }
              />
            </label>
            <label>
              Cidade
              <input
                required
                autoComplete="address-level2"
                maxLength={100}
                value={draft.address.city}
                onChange={(event) =>
                  onUpdateAddress("city", event.target.value)
                }
              />
            </label>
          </div>
        </div>
      )}

      <div className="checkout-address-fields">
        <h3>Seus dados de contato</h3>
        <label>
          Nome completo
          <input
            required
            autoComplete="name"
            maxLength={100}
            value={draft.contact.name}
            onChange={(event) => onUpdateContact("name", event.target.value)}
          />
        </label>
        <div className="checkout-field-pair">
          <label>
            E-mail
            <input
              required
              type="email"
              autoComplete="email"
              maxLength={160}
              value={draft.contact.email}
              onChange={(event) => onUpdateContact("email", event.target.value)}
            />
          </label>
          <label>
            Celular
            <input
              required
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={24}
              placeholder="(22) 99999-9999"
              value={draft.contact.phone}
              onChange={(event) => onUpdateContact("phone", event.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="checkout-actions">
        <Link className="text-button" to="/carrinho">
          <ArrowLeft size={16} /> Voltar à sacola
        </Link>
        <button
          className="button"
          disabled={
            !cartIsValid ||
            (draft.deliveryMethod === "pickup" && !draft.pickupAgreed)
          }
        >
          Continuar para o pagamento <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}
